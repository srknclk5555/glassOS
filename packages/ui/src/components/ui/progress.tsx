"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

interface ProgressProps extends React.ComponentPropsWithoutRef<"div"> {
  value?: number;
  max?: number;
  size?: "sm" | "md";
  variant?: "default" | "success" | "warning" | "danger";
}

const variantMap = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, size = "md", variant = "default", ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-glass-elevated",
          size === "sm" ? "h-1.5" : "h-2.5",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            variantMap[variant],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  },
);
Progress.displayName = "Progress";

export { Progress };
