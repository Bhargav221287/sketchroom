import * as React from "react";
import { cn } from "../utils.js";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "destructive" | "ghost" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-display font-semibold transition-all duration-100 ease-out select-none disabled:opacity-50 disabled:pointer-events-none rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

    const variantStyles = {
      primary:
        "bg-primary text-white shadow-tactile-primary border-2 border-primary active:translate-y-1 active:shadow-none hover:brightness-105",
      secondary:
        "bg-surface-1 text-text-primary border-2 border-border shadow-tactile active:translate-y-1 active:shadow-none hover:bg-surface-2",
      accent:
        "bg-accent text-white shadow-[0_4px_0_0_var(--accent-hover)] border-2 border-accent active:translate-y-1 active:shadow-none hover:brightness-105",
      destructive:
        "bg-danger text-white shadow-[0_4px_0_0_#B91C1C] border-2 border-danger active:translate-y-1 active:shadow-none hover:brightness-105",
      outline:
        "bg-transparent text-text-primary border-2 border-border hover:bg-surface-2 active:translate-y-0.5",
      ghost:
        "bg-transparent text-text-primary hover:bg-surface-2 active:bg-surface-3",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs gap-1.5",
      md: "h-11 px-5 text-sm gap-2",
      lg: "h-14 px-8 text-base gap-2.5",
      icon: "h-11 w-11 p-0 shrink-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
