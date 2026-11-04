import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { storiesApi } from "../api/stories";
import { tasksApi } from "../api/tasks";
import {
  UserStory,
  Task,
  StoryStatus,
  TaskStatus,
  PriorityLevel,
} from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ProgressBar } from "../components/ProgressBar";
import { Modal } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Layers,
  CheckSquare,
  Search,
  Filter,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";

export const HierarchyPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [collapsedStories, setCollapsedStories] = useState<
    Record<number, boolean>
  >({});

  // Modal states
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);

  // Form states for new Story
  const [storyTitle, setStoryTitle] = useState("");
  const [storyDesc, setStoryDesc] = useState("");
  const [storyCriteria, setStoryCriteria] = useState("");
  const [storyStatus, setStoryStatus] = useState<StoryStatus>("Backlog");
  const [storyPriority, setStoryPriority] = useState<PriorityLevel>("Medium");
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [storyAssigneeId, setStoryAssigneeId] = useState<number | "">("");

  // Form states for new Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("To Do");
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>("Medium");
  const [taskEstimate, setTaskEstimate] = useState<number>(2);
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<number | "">("");

  // Query project details & members
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

  // Query stories with tasks
  const { data: storiesData, isLoading } = useQuery({
    queryKey: ["project-stories", id, statusFilter, priorityFilter, search],
    queryFn: () =>
      projectsApi.getStories(id, {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      }),
    enabled: !!id,
  });

  // Create Story mutation
  const createStoryMutation = useMutation({
    mutationFn: (data: any) => projectsApi.createStory(id, data),
    onSuccess: (story) => {
      queryClient.invalidateQueries({ queryKey: ["project-stories", id] });
      showToast(`User Story '${story.title}' created!`, "success");
      setIsAddStoryOpen(false);
      setStoryTitle("");
      setStoryDesc("");
      setStoryCriteria("");
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to create story", "error"),
  });

  // Create Task mutation
  const createTaskMutation = useMutation({
    mutationFn: ({ storyId, data }: { storyId: number; data: any }) =>
      storiesApi.createTask(storyId, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["project-stories", id] });
      showToast(`Task '${task.title}' created!`, "success");
      setIsAddTaskOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskDueDate("");
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to create task", "error"),
  });

  // Toggle Task Status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-stories", id] });
      showToast("Task status updated", "success");
    },
  });

  const toggleCollapse = (storyId: number) => {
    setCollapsedStories((prev) => ({
      ...prev,
      [storyId]: !prev[storyId],
    }));
  };

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    createStoryMutation.mutate({
      title: storyTitle,
      description: storyDesc,
      acceptance_criteria: storyCriteria,
      status: storyStatus,
      priority: storyPriority,
      story_points: storyPoints ? Number(storyPoints) : null,
      assignee_id: storyAssigneeId ? Number(storyAssigneeId) : null,
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoryId) return;
    createTaskMutation.mutate({
      storyId: selectedStoryId,
      data: {
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        priority: taskPriority,
        estimate_hours: taskEstimate ? Number(taskEstimate) : null,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        assignee_id: taskAssigneeId ? Number(taskAssigneeId) : null,
      },
    });
  };

  const stories = storiesData?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-bold rounded text-xs">
              {project?.key}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Hierarchy Tree View
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Strict agile hierarchy: Project &rarr; User Story &rarr; Task
          </p>
        </div>

        <button
          onClick={() => setIsAddStoryOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add User Story</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stories or tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Story Statuses</option>
            <option value="Backlog">Backlog</option>
            <option value="Ready">Ready</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Root Project Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-slate-950 font-black text-lg">
              {project?.key?.slice(0, 2) || "P"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-teal-400 font-bold">
                  Root Project Level
                </span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-xs text-slate-400 font-mono">
                  {project?.key}
                </span>
              </div>
              <h2 className="text-xl font-black text-white">{project?.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300 font-semibold">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">
                User Stories
              </span>
              <span className="text-base font-bold text-white">
                {stories.length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">
                Sprint Tasks
              </span>
              <span className="text-base font-bold text-white">
                {stories.reduce((acc, s) => acc + s.tasks_count, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree Nodes: User Stories -> Tasks */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 font-medium">
            No user stories match your criteria.
          </p>
          <button
            onClick={() => setIsAddStoryOpen(true)}
            className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-500"
          >
            Create First User Story
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((story) => {
            const isCollapsed = !!collapsedStories[story.id];
            const tasks = story.tasks || [];

            return (
              <div
                key={story.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
              >
                {/* Story Node Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleCollapse(story.id)}
                      className="mt-1 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title={isCollapsed ? "Expand tasks" : "Collapse tasks"}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                          {project?.key}-{story.id}
                        </span>
                        <StatusBadge status={story.status} size="sm" />
                        <PriorityBadge priority={story.priority} />
                        {story.story_points && (
                          <span className="text-xs px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                            {story.story_points} pts
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/projects/${project?.id}/stories/${story.id}`}
                        className="text-base font-bold text-slate-900 hover:text-teal-600 flex items-center gap-1.5 group"
                      >
                        <span>{story.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </Link>

                      {story.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {story.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Progress Bar + Add Task + Assignee */}
                  <div className="flex items-center gap-6 ml-8 md:ml-0">
                    <div className="w-36">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>
                          {story.tasks_done_count}/{story.tasks_count} tasks
                        </span>
                      </div>
                      <ProgressBar
                        progress={story.progress_pct}
                        size="sm"
                        showText={false}
                      />
                    </div>

                    {story.assignee ? (
                      <div
                        className="w-7 h-7 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center text-xs font-bold"
                        title={`Assignee: ${story.assignee.full_name}`}
                      >
                        {story.assignee.full_name.charAt(0)}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Unassigned
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setSelectedStoryId(story.id);
                        setIsAddTaskOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Task</span>
                    </button>
                  </div>
                </div>

                {/* Child Tasks Branch */}
                {!isCollapsed && (
                  <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-4 space-y-2.5">
                    {tasks.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400 italic">
                        No tasks created yet for this story.
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const isDone = task.status === "Done";
                        const isOverdue =
                          task.due_date &&
                          !isDone &&
                          new Date(task.due_date) < new Date();

                        return (
                          <div
                            key={task.id}
                            className="bg-white rounded-xl p-3.5 border border-slate-200/70 shadow-2xs flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={(e) =>
                                  updateTaskStatusMutation.mutate({
                                    taskId: task.id,
                                    status: e.target.checked
                                      ? "Done"
                                      : "In Progress",
                                  })
                                }
                                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                              />

                              <span
                                className={`text-sm font-semibold truncate ${
                                  isDone
                                    ? "line-through text-slate-400"
                                    : "text-slate-800"
                                }`}
                              >
                                {task.title}
                              </span>

                              <StatusBadge status={task.status} size="sm" />
                              <PriorityBadge
                                priority={task.priority}
                                showIcon={false}
                              />
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                              {task.estimate_hours && (
                                <div
                                  className="flex items-center gap-1"
                                  title="Estimated Hours"
                                >
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{task.estimate_hours}h</span>
                                </div>
                              )}

                              {task.due_date && (
                                <div
                                  className={`flex items-center gap-1 ${
                                    isOverdue
                                      ? "text-rose-600 font-bold"
                                      : "text-slate-500"
                                  }`}
                                  title={
                                    isOverdue ? "Task Overdue!" : "Due Date"
                                  }
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    {new Date(task.due_date).toLocaleDateString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </span>
                                </div>
                              )}

                              {task.assignee ? (
                                <div
                                  className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold"
                                  title={task.assignee.full_name}
                                >
                                  {task.assignee.full_name.charAt(0)}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Story Modal */}
      <Modal
        isOpen={isAddStoryOpen}
        onClose={() => setIsAddStoryOpen(false)}
        title="Add User Story"
      >
        <form onSubmit={handleCreateStory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Story Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. As a user, I want to export project metrics..."
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={storyPriority}
                onChange={(e) =>
                  setStoryPriority(e.target.value as PriorityLevel)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Story Points
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assignee
            </label>
            <select
              value={storyAssigneeId}
              onChange={(e) =>
                setStoryAssigneeId(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user.full_name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Context and user persona goals..."
              value={storyDesc}
              onChange={(e) => setStoryDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Acceptance Criteria
            </label>
            <textarea
              rows={2}
              placeholder="- User can click export button&#10;- CSV downloads with proper columns"
              value={storyCriteria}
              onChange={(e) => setStoryCriteria(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
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

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Add Task to Story"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Write integration test suite"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) =>
                  setTaskPriority(e.target.value as PriorityLevel)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estimate (Hours)
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={taskEstimate}
                onChange={(e) => setTaskEstimate(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                value={taskAssigneeId}
                onChange={(e) =>
                  setTaskAssigneeId(
                    e.target.value ? Number(e.target.value) : "",
                  )
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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Technical implementation notes..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddTaskOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {createTaskMutation.isPending ? "Saving..." : "Add Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
