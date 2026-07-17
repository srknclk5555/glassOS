"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: "success" | "warning" | "danger" | "info" | "muted";
  size?: "sm" | "md";
  label?: string;
}

const colorMap = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-text-muted",
};

const sizeMap = {
  sm: "h-1.5 w-1.5",
  md: "h-2.5 w-2.5",
};

function StatusIndicator({
  color = "muted",
  size = "md",
  label,
  className,
  ...props
}: StatusIndicatorProps) {
  return (
    <span
      className={cn("relative inline-flex items-center gap-2", className)}
      {...props}
    >
      <span
        className={cn(
          "inline-block rounded-full",
          colorMap[color],
          sizeMap[size],
        )}
        aria-hidden="true"
      />
      {label && (
        <span className="text-sm text-text-secondary">{label}</span>
      )}
    </span>
  );
}

export { StatusIndicator };
