import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { Project } from "../types";
import { Modal } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  FolderPlus,
  Search,
  Users,
  Layers,
  ArrowRight,
  Archive,
  ArchiveRestore,
  UserPlus,
  Sparkles,
} from "lucide-react";

export const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form states
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "member">("member");

  // Query projects
  const { data, isLoading } = useQuery({
    queryKey: ["projects", search, statusFilter],
    queryFn: () =>
      projectsApi.list({ search, status: statusFilter || undefined }),
  });

  // Create Project mutation
  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showToast(`Project '${created.name}' created!`, "success");
      setIsCreateModalOpen(false);
      setNewName("");
      setNewKey("");
      setNewDesc("");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create project", "error");
    },
  });

  // Archive / Unarchive mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      projectsApi.update(id, { status }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showToast(
        `Project ${vars.status === "archived" ? "archived" : "restored"}!`,
        "success",
      );
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to update project status", "error");
    },
  });

  // Add Member mutation
  const addMemberMutation = useMutation({
    mutationFn: ({
      id,
      email,
      role,
    }: {
      id: number;
      email: string;
      role: "owner" | "member";
    }) => projectsApi.addMember(id, { user_email: email, role }),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showToast(`Added ${member.user.full_name} to project!`, "success");
      setIsMemberModalOpen(false);
      setMemberEmail("");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to add member", "error");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newKey) return;
    createMutation.mutate({
      name: newName,
      key: newKey.toUpperCase().trim(),
      description: newDesc,
    });
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !memberEmail) return;
    addMemberMutation.mutate({
      id: selectedProject.id,
      email: memberEmail.trim(),
      role: memberRole,
    });
  };

  const projects = data?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Projects
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your agile projects, user stories, and task backlogs
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="active">Active Only</option>
            <option value="archived">Archived Only</option>
            <option value="">All Projects</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-48 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No projects found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {search
              ? "No projects match your search query."
              : "Create your first agile project to start managing user stories and sprint tasks."}
          </p>
          {!search && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-500 shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const isOwner =
              project.owner_id === user?.id || user?.role === "admin";
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200/80 rounded-lg text-xs font-black tracking-wide">
                      {project.key}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        project.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <Link
                    to={`/projects/${project.id}/board`}
                    className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors line-clamp-1"
                  >
                    {project.name}
                  </Link>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 min-h-[2.5rem]">
                    {project.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <span>{project.stories_count || 0} Stories</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{project.members_count || 1} Members</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-slate-50/80 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setIsMemberModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100"
                          title="Add Member"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: project.id,
                              status:
                                project.status === "active"
                                  ? "archived"
                                  : "active",
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                          title={
                            project.status === "active"
                              ? "Archive Project"
                              : "Unarchive"
                          }
                        >
                          {project.status === "active" ? (
                            <Archive className="w-4 h-4" />
                          ) : (
                            <ArchiveRestore className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  <Link
                    to={`/projects/${project.id}/board`}
                    className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mobile Banking App"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                // Auto-suggest 3-4 char key from name
                if (!newKey) {
                  const words = e.target.value.trim().split(/\s+/);
                  const autoKey = words
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 4);
                  if (autoKey) setNewKey(autoKey);
                }
              }}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project Key (2-10 chars, Uppercase) *
            </label>
            <input
              type="text"
              required
              maxLength={10}
              placeholder="e.g. MBA"
              value={newKey}
              onChange={(e) =>
                setNewKey(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                )
              }
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none uppercase"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Short unique prefix for user stories and tasks.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of the goals and deliverables..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={`Add Member to ${selectedProject?.name}`}
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              User Email *
            </label>
            <input
              type="email"
              required
              placeholder="colleague@example.com"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              value={memberRole}
              onChange={(e) =>
                setMemberRole(e.target.value as "owner" | "member")
              }
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="member">
                Member (Can create & manage stories/tasks)
              </option>
              <option value="owner">
                Owner (Full administrative permissions)
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsMemberModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
