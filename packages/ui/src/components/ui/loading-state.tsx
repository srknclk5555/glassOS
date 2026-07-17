"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

function LoadingState({
  text,
  size = "md",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className,
      )}
      {...props}
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeMap[size])}
      />
      {text && (
        <p className="text-sm text-text-muted">{text}</p>
      )}
    </div>
  );
}

export { LoadingState };
