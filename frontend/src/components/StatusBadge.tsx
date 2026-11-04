import React from "react";
import { StoryStatus, TaskStatus } from "../types";

interface StatusBadgeProps {
  status: StoryStatus | TaskStatus | string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  const getColors = () => {
    switch (status) {
      case "Done":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "In Review":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Ready":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Blocked":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "To Do":
      case "Backlog":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${getColors()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status}
    </span>
  );
};
