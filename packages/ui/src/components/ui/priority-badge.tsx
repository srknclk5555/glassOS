"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";

type PriorityLevel = "critical" | "high" | "normal" | "low";

interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
}

const priorityConfig: Record<
  PriorityLevel,
  { label: string; className: string }
> = {
  critical: {
    label: "Critical",
    className:
      "bg-priority-critical/10 text-priority-critical border-priority-critical/20",
  },
  high: {
    label: "High",
    className:
      "bg-priority-high/10 text-priority-high border-priority-high/20",
  },
  normal: {
    label: "Normal",
    className:
      "bg-priority-normal/10 text-priority-normal border-priority-normal/20",
  },
  low: {
    label: "Low",
    className:
      "bg-priority-low/10 text-priority-low border-priority-low/20",
  },
};

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export { PriorityBadge, type PriorityLevel };
