import * as React from "react";
import { cn } from "../utils.js";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-surface-3 text-text-primary border-transparent",
    primary: "bg-primary-light text-primary border-primary/20",
    success: "bg-success-light text-success border-success/30 font-bold",
    warning: "bg-warning-light text-warning border-warning/30 font-bold",
    danger: "bg-danger-light text-danger border-danger/30 font-bold",
    outline: "text-text-primary border-border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-display font-semibold transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

