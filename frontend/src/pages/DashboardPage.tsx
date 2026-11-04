import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { ProgressBar } from "../components/ProgressBar";
import { StatusBadge } from "../components/StatusBadge";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  KanbanSquare,
  GitFork,
  FileBarChart,
  User,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project-dashboard", id],
    queryFn: () => projectsApi.getDashboard(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-slate-200 rounded-2xl w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">
          Failed to load dashboard
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Please ensure you have access to this project.
        </p>
        <Link
          to="/projects"
          className="mt-4 inline-block text-teal-600 font-semibold text-sm"
        >
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  const {
    project,
    story_status_counts,
    task_status_counts,
    total_stories,
    total_tasks,
    overall_progress_pct,
    overdue_tasks_count,
    workload_per_assignee,
  } = dashboard;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner with Quick Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-black rounded-lg text-xs tracking-wider">
              {project.key}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {project.name}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
            {project.description || "Sprint & Backlog overview"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Link
            to={`/projects/${project.id}/board`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <KanbanSquare className="w-4 h-4 text-teal-400" />
            <span>Kanban Board</span>
          </Link>
          <Link
            to={`/projects/${project.id}/hierarchy`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            <GitFork className="w-4 h-4 text-slate-600" />
            <span>Tree View</span>
          </Link>
          <Link
            to={`/projects/${project.id}/reports`}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            <FileBarChart className="w-4 h-4 text-slate-600" />
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Stories
            </span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {total_stories}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across all sprint columns
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Tasks
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {total_tasks}
          </div>
          <p className="text-xs text-slate-400 mt-1">Child work breakdown</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Overall Progress
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 mb-2">
            {overall_progress_pct}%
          </div>
          <ProgressBar
            progress={overall_progress_pct}
            showText={false}
            size="sm"
          />
        </div>

        <div
          className={`p-5 rounded-2xl border shadow-sm transition-colors ${
            overdue_tasks_count > 0
              ? "bg-rose-50/60 border-rose-200 text-rose-900"
              : "bg-white border-slate-200/80 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Overdue Tasks
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${overdue_tasks_count > 0 ? "text-rose-600" : "text-slate-400"}`}
            />
          </div>
          <div
            className={`text-3xl font-black ${overdue_tasks_count > 0 ? "text-rose-600" : "text-slate-900"}`}
          >
            {overdue_tasks_count}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {overdue_tasks_count > 0
              ? "Requires team attention"
              : "All tasks on schedule"}
          </p>
        </div>
      </div>

      {/* Two Column Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Story Status Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            User Stories by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(story_status_counts).map(([status, count]) => {
              const pct =
                total_stories > 0
                  ? Math.round((count / total_stories) * 100)
                  : 0;
              return (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3 w-40">
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-[2rem] text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Status Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            Tasks by Status
          </h3>
          <div className="space-y-3">
            {Object.entries(task_status_counts).map(([status, count]) => {
              const pct =
                total_tasks > 0 ? Math.round((count / total_tasks) * 100) : 0;
              return (
                <div
                  key={status}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3 w-40">
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-[2rem] text-right">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Workload per Assignee
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Distribution of tasks, user stories, points, and estimated hours
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Team Member</th>
                <th className="pb-3 text-center">Tasks</th>
                <th className="pb-3 text-center">Stories</th>
                <th className="pb-3 text-center">Story Points</th>
                <th className="pb-3 text-right">Estimate (Hours)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workload_per_assignee.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="py-3.5 flex items-center gap-2.5 font-semibold text-slate-900">
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-600 font-bold">
                      {item.user_name.charAt(0)}
                    </div>
                    <span>{item.user_name}</span>
                  </td>
                  <td className="py-3.5 text-center font-bold text-slate-800">
                    {item.task_count}
                  </td>
                  <td className="py-3.5 text-center text-slate-600">
                    {item.story_count}
                  </td>
                  <td className="py-3.5 text-center font-semibold text-teal-700">
                    {item.story_points}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-slate-800">
                    {item.estimated_hours.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
