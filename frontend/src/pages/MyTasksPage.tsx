import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../api/tasks";
import { TaskStatus } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { useToast } from "../context/ToastContext";
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  FolderGit2,
  ExternalLink,
} from "lucide-react";

export const MyTasksPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["my-tasks", statusFilter],
    queryFn: () => tasksApi.getMyTasks(statusFilter || undefined),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.update(taskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      showToast("Task updated", "success");
    },
  });

  const tasks = data?.items || [];
  const now = new Date();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-teal-600" />
            <span>My Assigned Tasks</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All tasks currently assigned to you across all projects
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filter:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
          >
            <option value="">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter
              ? `You have no tasks in '${statusFilter}' status.`
              : "You have no assigned tasks. Tasks assigned to you will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === "Done";
            const isOverdue =
              task.due_date && !isDone && new Date(task.due_date) < now;
            const isDueSoon =
              task.due_date &&
              !isDone &&
              !isOverdue &&
              new Date(task.due_date).getTime() - now.getTime() <
                24 * 60 * 60 * 1000;

            const story = task.story;
            const project = story?.project;

            return (
              <div
                key={task.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(e) =>
                      updateStatusMutation.mutate({
                        taskId: task.id,
                        status: e.target.checked ? "Done" : "In Progress",
                      })
                    }
                    className="mt-1 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {project && (
                        <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {project.key}
                        </span>
                      )}
                      <StatusBadge status={task.status} size="sm" />
                      <PriorityBadge
                        priority={task.priority}
                        showIcon={false}
                      />
                    </div>

                    <p
                      className={`text-base font-bold truncate ${
                        isDone
                          ? "line-through text-slate-400"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </p>

                    {story && (
                      <Link
                        to={`/projects/${story.project_id}/stories/${story.id}`}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600 font-medium mt-1 truncate"
                      >
                        <span>Under story: {story.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 self-end sm:self-center">
                  {task.estimate_hours && (
                    <span className="flex items-center gap-1" title="Estimate">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{task.estimate_hours}h</span>
                    </span>
                  )}

                  {task.due_date && (
                    <span
                      className={`flex items-center gap-1 ${
                        isOverdue
                          ? "text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md"
                          : isDueSoon
                            ? "text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded-md"
                            : "text-slate-600"
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isOverdue
                          ? "Overdue: "
                          : isDueSoon
                            ? "Due Soon: "
                            : "Due: "}
                        {new Date(task.due_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
