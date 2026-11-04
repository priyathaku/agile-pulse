import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { storiesApi } from "../api/stories";
import { UserStory, StoryStatus, PriorityLevel } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ProgressBar } from "../components/ProgressBar";
import { Modal } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  GripVertical,
} from "lucide-react";

const COLUMNS: { id: StoryStatus; title: string; color: string }[] = [
  { id: "Backlog", title: "Backlog", color: "border-slate-300" },
  { id: "Ready", title: "Ready", color: "border-amber-400" },
  { id: "In Progress", title: "In Progress", color: "border-blue-400" },
  { id: "In Review", title: "In Review", color: "border-purple-400" },
  { id: "Done", title: "Done", color: "border-emerald-400" },
];

export const KanbanPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [targetColumnForNew, setTargetColumnForNew] =
    useState<StoryStatus>("Backlog");

  // Drag-and-drop state
  const [draggedStoryId, setDraggedStoryId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<StoryStatus | null>(
    null,
  );

  // New Story Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCriteria, setNewCriteria] = useState("");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("Medium");
  const [newPoints, setNewPoints] = useState<number>(3);
  const [newAssigneeId, setNewAssigneeId] = useState<number | "">("");

  // Project and members query
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => projectsApi.getMembers(id),
    enabled: !!id,
  });

  // Stories query
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ["project-stories", id, priorityFilter, search],
    queryFn: () =>
      projectsApi.getStories(id, {
        priority: priorityFilter || undefined,
        search: search || undefined,
      }),
    enabled: !!id,
  });

  // Reorder / move story mutation with Optimistic Update
  const reorderMutation = useMutation({
    mutationFn: ({
      storyId,
      position,
      status,
    }: {
      storyId: number;
      position: number;
      status: StoryStatus;
    }) => storiesApi.reorder(storyId, { position, status }),

    onMutate: async ({ storyId, position, status }) => {
      // Cancel ongoing queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["project-stories", id] });
      const previousStories = queryClient.getQueryData([
        "project-stories",
        id,
        priorityFilter,
        search,
      ]);

      // Optimistically update cache
      queryClient.setQueryData(
        ["project-stories", id, priorityFilter, search],
        (old: any) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map((s: UserStory) =>
              s.id === storyId ? { ...s, status, position } : s,
            ),
          };
        },
      );

      return { previousStories };
    },

    onError: (err: any, _, context) => {
      // Rollback on failure
      if (context?.previousStories) {
        queryClient.setQueryData(
          ["project-stories", id, priorityFilter, search],
          context.previousStories,
        );
      }
      showToast(
        err.message || "Failed to move story. Reverting changes.",
        "error",
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project-stories", id] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", id] });
    },
  });

  // Create Story mutation
  const createStoryMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createStory(id, data),
    onSuccess: (story) => {
      queryClient.invalidateQueries({ queryKey: ["project-stories", id] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", id] });
      showToast(
        `User Story '${story.title}' created in ${story.status}!`,
        "success",
      );
      setIsAddStoryOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewCriteria("");
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to create story", "error"),
  });

  const handleDragStart = (e: React.DragEvent, storyId: number) => {
    setDraggedStoryId(storyId);
    e.dataTransfer.setData("text/plain", storyId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: StoryStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: StoryStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const storyIdStr = e.dataTransfer.getData("text/plain");
    const storyId = Number(storyIdStr);
    if (!storyId) return;

    const allStories = storiesData?.items || [];
    const targetColStories = allStories
      .filter((s) => s.status === targetStatus && s.id !== storyId)
      .sort((a, b) => a.position - b.position);

    // Calculate position: append to bottom with +1000
    const lastStory = targetColStories[targetColStories.length - 1];
    const newPosition = lastStory ? lastStory.position + 1000.0 : 1000.0;

    reorderMutation.mutate({
      storyId,
      status: targetStatus,
      position: newPosition,
    });

    setDraggedStoryId(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStoryMutation.mutate({
      title: newTitle,
      description: newDesc,
      acceptance_criteria: newCriteria,
      status: targetColumnForNew,
      priority: newPriority,
      story_points: newPoints ? Number(newPoints) : null,
      assignee_id: newAssigneeId ? Number(newAssigneeId) : null,
    });
  };

  const allStories = storiesData?.items || [];
  const filteredStories = allStories.filter((story) => {
    if (assigneeFilter && String(story.assignee_id) !== assigneeFilter)
      return false;
    return true;
  });

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-bold rounded text-xs">
              {project?.key}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Kanban Board
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Drag cards across columns to update workflow status in real-time
          </p>
        </div>

        <button
          onClick={() => {
            setTargetColumnForNew("Backlog");
            setIsAddStoryOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New User Story</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5 Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start min-h-[600px] overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colStories = filteredStories
            .filter((s) => s.status === col.id)
            .sort((a, b) => a.position - b.position);

          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`bg-slate-100/80 rounded-2xl p-3 border-t-4 ${col.color} border-slate-200/80 flex flex-col min-h-[500px] transition-colors ${
                isOver
                  ? "bg-teal-50/70 border-teal-400 ring-2 ring-teal-400/30"
                  : ""
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/60 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    {col.title}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                    {colStories.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setTargetColumnForNew(col.id);
                    setIsAddStoryOpen(true);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                  title={`Add story to ${col.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1">
                {colStories.length === 0 ? (
                  <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs italic">
                    Drop stories here
                  </div>
                ) : (
                  colStories.map((story) => {
                    const isDragging = draggedStoryId === story.id;

                    return (
                      <div
                        key={story.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, story.id)}
                        className={`bg-white rounded-xl p-4 shadow-2xs border border-slate-200/80 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? "opacity-40 scale-95 border-teal-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            {project?.key}-{story.id}
                          </span>
                          <PriorityBadge priority={story.priority} />
                        </div>

                        <Link
                          to={`/projects/${project?.id}/stories/${story.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-teal-600 line-clamp-2 block mb-2"
                        >
                          {story.title}
                        </Link>

                        {/* Progress Bar & Story Points */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                            <span>
                              {story.tasks_done_count}/{story.tasks_count} tasks
                            </span>
                            {story.story_points && (
                              <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {story.story_points} pts
                              </span>
                            )}
                          </div>
                          <ProgressBar
                            progress={story.progress_pct}
                            size="sm"
                            showText={false}
                          />
                        </div>

                        {/* Assignee Avatar */}
                        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1 text-[11px]">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                            <span>Drag to move</span>
                          </div>

                          {story.assignee ? (
                            <div
                              className="w-6 h-6 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center text-[10px] font-bold"
                              title={story.assignee.full_name}
                            >
                              {story.assignee.full_name.charAt(0)}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Story Modal */}
      <Modal
        isOpen={isAddStoryOpen}
        onClose={() => setIsAddStoryOpen(false)}
        title="New User Story"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Story Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement real-time notifications"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Column Status
              </label>
              <select
                value={targetColumnForNew}
                onChange={(e) =>
                  setTargetColumnForNew(e.target.value as StoryStatus)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value as PriorityLevel)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Story Points
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                value={newAssigneeId}
                onChange={(e) =>
                  setNewAssigneeId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Context and details..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddStoryOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStoryMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {createStoryMutation.isPending ? "Saving..." : "Add Story"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
