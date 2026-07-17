"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";

type ProductionStatus =
  | "pending"
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "on-hold";

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  className?: string;
}

const statusConfig: Record<
  ProductionStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-queue-waiting/10 text-queue-waiting border-queue-waiting/20",
  },
  queued: {
    label: "Queued",
    className:
      "bg-queue-waiting/10 text-queue-waiting border-queue-waiting/20",
  },
  running: {
    label: "Running",
    className:
      "bg-queue-running/10 text-queue-running border-queue-running/20",
  },
  paused: {
    label: "Paused",
    className:
      "bg-queue-paused/10 text-queue-paused border-queue-paused/20",
  },
  completed: {
    label: "Completed",
    className:
      "bg-queue-completed/10 text-queue-completed border-queue-completed/20",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-queue-cancelled/10 text-queue-cancelled border-queue-cancelled/20",
  },
  "on-hold": {
    label: "On Hold",
    className:
      "bg-queue-paused/10 text-queue-paused border-queue-paused/20",
  },
};

function ProductionStatusBadge({
  status,
  className,
}: ProductionStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export { ProductionStatusBadge, type ProductionStatus };
