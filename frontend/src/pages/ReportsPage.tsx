import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../api/projects";
import { jobsApi } from "../api/jobs";
import { useToast } from "../context/ToastContext";
import {
  FileBarChart,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  Layers,
} from "lucide-react";

export const ReportsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Query project info
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
    enabled: !!id,
  });

  // Query recent reports/jobs for project
  const { data: reports = [], refetch: refetchReports } = useQuery({
    queryKey: ["project-reports", id],
    queryFn: () => projectsApi.listReports(id),
    enabled: !!id,
    refetchInterval: activeJobId ? 2000 : 15000, // Poll faster when a job is active
  });

  // Query status of active polled job
  const { data: activeJob } = useQuery({
    queryKey: ["job-status", activeJobId],
    queryFn: () => jobsApi.get(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "succeeded" || status === "failed" || status === "dead") {
        return false;
      }
      return 2000; // poll every 2s while running
    },
  });

  // Trigger report generation mutation
  const requestReportMutation = useMutation({
    mutationFn: () => projectsApi.requestReport(id, format),
    onSuccess: (res) => {
      setActiveJobId(res.job_id);
      queryClient.invalidateQueries({ queryKey: ["project-reports", id] });
      showToast("Report generation queued in background!", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to request report", "error");
    },
  });

  // Retry dead job mutation
  const retryMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.retry(jobId),
    onSuccess: (_, jobId) => {
      setActiveJobId(jobId);
      queryClient.invalidateQueries({ queryKey: ["project-reports", id] });
      showToast("Job queued for retry!", "info");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to retry job", "error");
    },
  });

  const handleDownload = (jobId: string) => {
    window.open(`/api/v1/projects/${id}/reports/${jobId}/download`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 font-bold rounded text-xs">
              {project?.key}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileBarChart className="w-6 h-6 text-teal-600" />
              <span>Project Reports & Exports</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Asynchronous background report compiler with CSV & JSON exports
          </p>
        </div>

        <button
          onClick={() => refetchReports()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Generator Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Generate New Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generates a snapshot containing all user stories, tasks, progress
            metrics, and assignee workload.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Format:
            </span>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  format === "csv"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>CSV Spreadsheet</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  format === "json"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileJson className="w-4 h-4 text-blue-600" />
                <span>JSON Payload</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => requestReportMutation.mutate()}
            disabled={requestReportMutation.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50"
          >
            {requestReportMutation.isPending
              ? "Queuing..."
              : "Generate Report (Async)"}
          </button>
        </div>

        {/* Real-time Polling Status Banner (if a job is active) */}
        {activeJob && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
              activeJob.status === "succeeded"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : activeJob.status === "failed" || activeJob.status === "dead"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-blue-50 border-blue-200 text-blue-900 animate-pulse"
            }`}
          >
            <div className="flex items-center gap-3">
              {activeJob.status === "succeeded" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : activeJob.status === "failed" ||
                activeJob.status === "dead" ? (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              ) : (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold">
                  Background Job Status:{" "}
                  <span className="uppercase tracking-wide font-black">
                    {activeJob.status}
                  </span>
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  Job ID: {activeJob.id} &bull; Attempts: {activeJob.attempts}/
                  {activeJob.max_attempts}
                </p>
              </div>
            </div>

            {activeJob.status === "succeeded" && (
              <button
                onClick={() => handleDownload(activeJob.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ready File</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Generated Reports List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Report History</h2>

        {reports.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs italic">
            No report generation jobs found for this project. Click "Generate
            Report" above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((job) => {
              const formatType = job.payload?.format || "json";
              const isReady = job.status === "succeeded" && job.result;
              const isDead = job.status === "dead" || job.status === "failed";

              return (
                <div
                  key={job.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      {formatType === "csv" ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <FileJson className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 uppercase">
                          {formatType} Report
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            job.status === "succeeded"
                              ? "bg-emerald-100 text-emerald-800"
                              : isDead
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Created: {new Date(job.created_at).toLocaleString()}{" "}
                        &bull; Attempts: {job.attempts}/{job.max_attempts}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isReady && (
                      <button
                        onClick={() => handleDownload(job.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {formatType.toUpperCase()}</span>
                      </button>
                    )}

                    {isDead && (
                      <button
                        onClick={() => retryMutation.mutate(job.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Dead Job</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
