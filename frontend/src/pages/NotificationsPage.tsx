import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";
import { useToast } from "../context/ToastContext";
import { Bell, Check, CheckCheck, Clock, ExternalLink } from "lucide-react";

export const NotificationsPage: React.FC = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () => notificationsApi.list(unreadOnly),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      showToast(res.message, "success");
    },
  });

  const notifications = data?.items || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-teal-600" />
            <span>Notifications</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Asynchronous background event alerts and due-date reminders
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
            <span>Unread only</span>
          </label>

          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={
              markAllReadMutation.isPending || notifications.length === 0
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-40"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No notifications
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            You're all caught up! New assignment notifications and due-date
            alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                n.read
                  ? "bg-white border-slate-200/80"
                  : "bg-teal-50/40 border-teal-200 shadow-2xs"
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                  )}
                  <h4 className="text-sm font-bold text-slate-900">
                    {n.title}
                  </h4>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {n.message}
                </p>

                <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleString()}
                  </span>

                  {n.link && (
                    <Link
                      to={n.link}
                      className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-bold"
                    >
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!n.read && (
                <button
                  onClick={() => markReadMutation.mutate(n.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
