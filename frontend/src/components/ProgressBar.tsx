import React from "react";

interface ProgressBarProps {
  progress: number;
  showText?: boolean;
  size?: "sm" | "md";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showText = true,
  size = "md",
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const getBarColor = (pct: number) => {
    if (pct === 100) return "bg-emerald-500";
    if (pct >= 50) return "bg-teal-500";
    if (pct >= 20) return "bg-blue-500";
    return "bg-amber-500";
  };

  const heightClass = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="w-full flex items-center gap-2">
      <div
        className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass}`}
      >
        <div
          className={`${heightClass} rounded-full transition-all duration-300 ease-out ${getBarColor(
            clamped,
          )}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs font-semibold text-slate-600 min-w-[2.5rem] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
};
