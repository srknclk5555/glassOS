"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";

type GlassStatus =
  | "idle"
  | "running"
  | "paused"
  | "maintenance"
  | "offline"
  | "setup";

interface GlassStatusBadgeProps {
  status: GlassStatus;
  className?: string;
}

const statusConfig: Record<GlassStatus, { label: string; className: string }> =
  {
    idle: {
      label: "Idle",
      className: "bg-station-idle/10 text-station-idle border-station-idle/20",
    },
    running: {
      label: "Running",
      className:
        "bg-station-active/10 text-station-active border-station-active/20",
    },
    paused: {
      label: "Paused",
      className:
        "bg-queue-paused/10 text-queue-paused border-queue-paused/20",
    },
    maintenance: {
      label: "Maintenance",
      className:
        "bg-station-maintenance/10 text-station-maintenance border-station-maintenance/20",
    },
    offline: {
      label: "Offline",
      className:
        "bg-station-offline/10 text-station-offline border-station-offline/20",
    },
    setup: {
      label: "Setup",
      className:
        "bg-queue-waiting/10 text-queue-waiting border-queue-waiting/20",
    },
  };

function GlassStatusBadge({ status, className }: GlassStatusBadgeProps) {
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

export { GlassStatusBadge, type GlassStatus };
