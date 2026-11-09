import * as React from "react";
import { cn } from "../utils.js";

export interface ProgressRingProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // Current seconds left
  max: number; // Total seconds
  size?: number; // Size in px
  strokeWidth?: number;
  showText?: boolean;
}

export function ProgressRing({
  value,
  max,
  size = 54,
  strokeWidth = 5,
  showText = true,
  className,
  ...props
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const strokeDashoffset = circumference - fraction * circumference;

  // Color shifting: Green (>50%) -> Amber (20-50%) -> Red (<20% or <10s)
  let ringColor = "text-success";
  const isUrgent = value <= 10;
  if (value <= 10 || fraction <= 0.2) {
    ringColor = "text-danger";
  } else if (fraction <= 0.5) {
    ringColor = "text-warning";
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center select-none",
        isUrgent && "animate-pulse-fast",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-surface-3 fill-none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn("fill-none transition-all duration-300 ease-linear", ringColor)}
          stroke="currentColor"
        />
      </svg>
      {showText && (
        <span
          className={cn(
            "absolute font-display font-bold text-sm tracking-tight",
            isUrgent ? "text-danger" : "text-text-primary"
          )}
        >
          {Math.ceil(value)}
        </span>
      )}
    </div>
  );
}
