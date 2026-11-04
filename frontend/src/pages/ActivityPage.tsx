import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { Activity, Clock, ArrowLeft, User } from "lucide-react";

export const ActivityPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["project-activity", id],
    queryFn: () => projectsApi.getActivity(id),
    enabled: !!id,
  });

  const formatAction = (action: string) => {
    switch (action) {
      case "project_created":
        return "Created project";
      case "project_updated":
        return "Updated project settings";
      case "member_added":
        return "Added team member";
      case "member_removed":
        return "Removed team member";
      case "story_created":
        return "Created user story";
      case "story_updated":
        return "Updated user story";
      case "story_completed":
        return "Completed user story";
      case "story_auto_promoted":
        return "Auto-promoted story (all tasks finished)";
      case "story_deleted":
        return "Deleted user story";
      case "task_created":
        return "Created task";
      case "task_updated":
        return "Updated task";
      case "task_deleted":
        return "Deleted task";
      case "comment_added":
        return "Posted a comment";
      default:
        return action.replace(/_/g, " ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/projects/${id}/board`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-teal-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Board</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-bold rounded text-xs">
            {project?.key}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" />
            <span>Project Audit Trail & Activity Log</span>
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Immutable event log of all project actions, story changes, and status
          transitions
        </p>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-8">
            No activity logged yet for this project.
          </p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {logs.map((log) => (
              <div
                key={log.id}
                className="relative flex items-start gap-3.5 group"
              >
                {/* Dot */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                </div>

                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {formatAction(log.action)}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {log.user?.full_name || "System / Automated Rule"}
                    </span>{" "}
                    performed action on{" "}
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 px-1 py-0.5 rounded">
                      {log.entity_type} #{log.entity_id}
                    </span>
                  </div>

                  {log.details && (
                    <div className="mt-2 text-[11px] font-mono bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
