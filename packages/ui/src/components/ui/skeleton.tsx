"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-glass-elevated",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
