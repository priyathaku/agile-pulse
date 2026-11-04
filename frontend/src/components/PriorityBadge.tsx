import React from "react";
import { PriorityLevel } from "../types";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

interface PriorityBadgeProps {
  priority: PriorityLevel | string;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
}) => {
  const getConfig = () => {
    switch (priority) {
      case "Critical":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
        };
      case "High":
        return {
          bg: "bg-orange-50 text-orange-700 border-orange-200",
          icon: <ArrowUp className="w-3.5 h-3.5 mr-1 text-orange-600" />,
        };
      case "Medium":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-blue-600" />,
        };
      case "Low":
      default:
        return {
          bg: "bg-slate-50 text-slate-600 border-slate-200",
          icon: <ArrowDown className="w-3.5 h-3.5 mr-1 text-slate-500" />,
        };
    }
  };

  const config = getConfig();

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg}`}
    >
      {showIcon && config.icon}
      {priority}
    </span>
  );
};
