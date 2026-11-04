import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storiesApi } from "../api/stories";
import { tasksApi } from "../api/tasks";
import { projectsApi } from "../api/projects";
import { Task, StoryStatus, TaskStatus, PriorityLevel } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { ProgressBar } from "../components/ProgressBar";
import { Modal } from "../components/Modal";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  MessageSquare,
  Send,
  Trash2,
  Edit,
  User as UserIcon,
} from "lucide-react";

export const StoryDetailPage: React.FC = () => {
  const { projectId, storyId } = useParams<{
    projectId: string;
    storyId: string;
  }>();
  const pId = Number(projectId);
  const sId = Number(storyId);

  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isEditStoryOpen, setIsEditStoryOpen] = useState(false);

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("To Do");
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>("Medium");
  const [taskEstimate, setTaskEstimate] = useState<number>(2);
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [taskAssigneeId, setTaskAssigneeId] = useState<number | "">("");

  // Edit story state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCriteria, setEditCriteria] = useState("");
  const [editStatus, setEditStatus] = useState<StoryStatus>("Backlog");
  const [editPriority, setEditPriority] = useState<PriorityLevel>("Medium");
  const [editPoints, setEditPoints] = useState<number>(3);
  const [editAssigneeId, setEditAssigneeId] = useState<number | "">("");

  // Query story details
  const {
    data: story,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["story", sId],
    queryFn: () => storiesApi.get(sId),
    enabled: !!sId,
  });

  // Query members for assignment
  const { data: members = [] } = useQuery({
    queryKey: ["project-members", pId],
    queryFn: () => projectsApi.getMembers(pId),
    enabled: !!pId,
  });

  // Query comments
  const { data: comments = [] } = useQuery({
    queryKey: ["story-comments", sId],
    queryFn: () => storiesApi.getComments(sId),
    enabled: !!sId,
  });

  // Update Story mutation
  const updateStoryMutation = useMutation({
    mutationFn: (data: any) => storiesApi.update(sId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", sId] });
      queryClient.invalidateQueries({ queryKey: ["project-stories", pId] });
      showToast("Story updated successfully", "success");
      setIsEditStoryOpen(false);
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to update story", "error"),
  });

  // Add Task mutation
  const addTaskMutation = useMutation({
    mutationFn: (data: any) => storiesApi.createTask(sId, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["story", sId] });
      queryClient.invalidateQueries({ queryKey: ["project-stories", pId] });
      showToast(`Task '${task.title}' added!`, "success");
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
      queryClient.invalidateQueries({ queryKey: ["story", sId] });
      queryClient.invalidateQueries({ queryKey: ["project-stories", pId] });
      showToast("Task updated", "success");
    },
  });

  // Delete Task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story", sId] });
      queryClient.invalidateQueries({ queryKey: ["project-stories", pId] });
      showToast("Task deleted", "success");
    },
  });

  // Add Comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) => storiesApi.addComment(sId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["story-comments", sId] });
      setCommentText("");
      showToast("Comment posted", "success");
    },
    onError: (err: any) =>
      showToast(err.message || "Failed to post comment", "error"),
  });

  const handleEditOpen = () => {
    if (!story) return;
    setEditTitle(story.title);
    setEditDesc(story.description || "");
    setEditCriteria(story.acceptance_criteria || "");
    setEditStatus(story.status);
    setEditPriority(story.priority);
    setEditPoints(story.story_points || 0);
    setEditAssigneeId(story.assignee_id || "");
    setIsEditStoryOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoryMutation.mutate({
      title: editTitle,
      description: editDesc,
      acceptance_criteria: editCriteria,
      status: editStatus,
      priority: editPriority,
      story_points: editPoints ? Number(editPoints) : null,
      assignee_id: editAssigneeId ? Number(editAssigneeId) : null,
    });
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTaskMutation.mutate({
      title: taskTitle,
      description: taskDesc,
      status: taskStatus,
      priority: taskPriority,
      estimate_hours: taskEstimate ? Number(taskEstimate) : null,
      due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
      assignee_id: taskAssigneeId ? Number(taskAssigneeId) : null,
    });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">
          User Story not found
        </h2>
        <Link
          to={`/projects/${pId}/board`}
          className="mt-4 inline-block text-teal-600 font-semibold"
        >
          &larr; Back to Board
        </Link>
      </div>
    );
  }

  const tasks = story.tasks || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to={`/projects/${pId}/board`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kanban Board</span>
        </Link>
      </div>

      {/* Story Main Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold rounded-lg text-xs">
                Story #{story.id}
              </span>
              <StatusBadge status={story.status} />
              <PriorityBadge priority={story.priority} />
              {story.story_points && (
                <span className="text-xs px-2.5 py-1 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                  {story.story_points} Points
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {story.title}
            </h1>
          </div>

          <button
            onClick={handleEditOpen}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Story</span>
          </button>
        </div>

        {/* Story Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase">
              Assignee
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block">
              {story.assignee?.full_name || "Unassigned"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">
              Created At
            </span>
            <span className="font-bold text-slate-800 mt-0.5 block">
              {new Date(story.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">
              Progress
            </span>
            <div className="mt-1">
              <ProgressBar progress={story.progress_pct} size="sm" />
            </div>
          </div>
        </div>

        {/* Description & Acceptance Criteria */}
        {story.description && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Description
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {story.description}
            </p>
          </div>
        )}

        {story.acceptance_criteria && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Acceptance Criteria
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
              {story.acceptance_criteria}
            </div>
          </div>
        )}
      </div>

      {/* Child Tasks Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Child Tasks ({story.tasks_done_count}/{tasks.length} Done)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rule: when all tasks are Done, story auto-advances to In Review /
              Done
            </p>
          </div>

          <button
            onClick={() => setIsAddTaskOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm italic">
            No tasks yet. Break down this user story into concrete engineering
            tasks.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isDone = task.status === "Done";
              const isOverdue =
                task.due_date &&
                !isDone &&
                new Date(task.due_date) < new Date();

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white shadow-2xs gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={(e) =>
                        updateTaskStatusMutation.mutate({
                          taskId: task.id,
                          status: e.target.checked ? "Done" : "In Progress",
                        })
                      }
                      className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    />

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isDone
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} size="sm" />
                    <PriorityBadge priority={task.priority} showIcon={false} />

                    {task.estimate_hours && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {task.estimate_hours}h
                      </span>
                    )}

                    {task.due_date && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1 ${
                          isOverdue
                            ? "text-rose-600 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(task.due_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}

                    {task.assignee ? (
                      <div
                        className="w-6 h-6 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center text-[10px] font-bold"
                        title={task.assignee.full_name}
                      >
                        {task.assignee.full_name.charAt(0)}
                      </div>
                    ) : null}

                    <button
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-600" />
          <span>Comments & Activity Discussion ({comments.length})</span>
        </h2>

        {/* Comment Input */}
        <form onSubmit={handleAddComment} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              rows={2}
              placeholder="Leave a comment or question for team members..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!commentText.trim() || addCommentMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Comment</span>
              </button>
            </div>
          </div>
        </form>

        {/* Comments Feed */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No comments yet. Start the conversation!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {comment.user?.full_name?.charAt(0) || "U"}
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">
                      {comment.user?.full_name || "Anonymous"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Story Modal */}
      <Modal
        isOpen={isEditStoryOpen}
        onClose={() => setIsEditStoryOpen(false)}
        title="Edit User Story"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as StoryStatus)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Backlog">Backlog</option>
                <option value="Ready">Ready</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={editPriority}
                onChange={(e) =>
                  setEditPriority(e.target.value as PriorityLevel)
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
                value={editPoints}
                onChange={(e) => setEditPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assignee
              </label>
              <select
                value={editAssigneeId}
                onChange={(e) =>
                  setEditAssigneeId(
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Acceptance Criteria
            </label>
            <textarea
              rows={3}
              value={editCriteria}
              onChange={(e) => setEditCriteria(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditStoryOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStoryMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {updateStoryMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title="Add Task"
      >
        <form onSubmit={handleAddTaskSubmit} className="space-y-4">
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
              placeholder="Technical notes..."
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
              disabled={addTaskMutation.isPending}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {addTaskMutation.isPending ? "Saving..." : "Add Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
