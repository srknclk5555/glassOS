import type { LucideIcon } from "lucide-react";

export interface QueueJobItem {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  pieces: number;
  widthMm: number;
  heightMm: number;
  areaM2: number;
  priority: number;
  estimatedTime?: string;
  createdAt: string;
  status: string;
  isRework: boolean;
  queueItemId: string;
}

export interface StationFilter {
  id: string;
  name: string;
  stationType: string;
}

export interface MachineFilter {
  id: string;
  name: string;
  machineType: string;
}

export interface OperationFilter {
  operationCode: string;
  operationName: string;
}

export interface ActiveWorkItem {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  machineName?: string;
  pieces: number;
  piecesCompleted: number;
  piecesRemaining: number;
  startedAt: string;
  elapsedMinutes: number;
  progress: number;
  status: string;
}

export interface QueueSummary {
  waitingJobs: number;
  runningJobs: number;
  completedToday: number;
  avgQueueTimeMinutes: number;
}

export interface TimelineEvent {
  eventType: string;
  timestamp: string;
  fromOperation?: string;
  toOperation?: string;
}

export interface QueueDetail {
  id: string;
  glassBarcode: string;
  orderNumber: string;
  customerName: string;
  operation: string;
  stationName: string;
  widthMm: number;
  heightMm: number;
  pieces: number;
  areaM2: number;
  priority: number;
  status: string;
  isRework: boolean;
  recipeName?: string;
  notes?: string;
  createdAt: string;
  timeline: TimelineEvent[];
}

export interface QueueFiltersState {
  stationId: string;
  machineId: string;
  operation: string;
  priority: string;
  status: string;
  search: string;
}

export type JobStatus =
  | "waiting"
  | "assigned"
  | "running"
  | "paused"
  | "completed"
  | "blocked"
  | "rework";

export const JOB_STATUS_CONFIG: Record<
  string,
  { labelKey: string; color: string; bg: string; dot: string }
> = {
  waiting: {
    labelKey: "queue.waiting",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
  },
  assigned: {
    labelKey: "queue.assigned",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    dot: "bg-blue-500",
  },
  in_progress: {
    labelKey: "queue.running",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
  },
  paused: {
    labelKey: "queue.paused",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    dot: "bg-amber-500",
  },
  completed: {
    labelKey: "queue.completed",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    dot: "bg-emerald-500",
  },
  blocked: {
    labelKey: "queue.blocked",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    dot: "bg-red-500",
  },
  rework: {
    labelKey: "queue.rework",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    dot: "bg-purple-500",
  },
};

export const PRIORITY_CONFIG: Record<
  number,
  { labelKey: string; color: string }
> = {
  1: { labelKey: "queue.critical", color: "text-red-600 dark:text-red-400" },
  50: { labelKey: "queue.high", color: "text-orange-600 dark:text-orange-400" },
  100: { labelKey: "queue.normal", color: "text-sky-600 dark:text-sky-400" },
  200: { labelKey: "queue.low", color: "text-gray-500 dark:text-gray-400" },
};

export function getPriorityLabel(priority: number): string {
  if (priority <= 1) return "queue.critical";
  if (priority <= 50) return "queue.high";
  if (priority <= 100) return "queue.normal";
  return "queue.low";
}

export function getPriorityColor(priority: number): string {
  if (priority <= 1) return "text-red-600 dark:text-red-400";
  if (priority <= 50) return "text-orange-600 dark:text-orange-400";
  if (priority <= 100) return "text-sky-600 dark:text-sky-400";
  return "text-gray-500 dark:text-gray-400";
}

export function formatElapsed(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
