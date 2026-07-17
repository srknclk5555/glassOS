"use client";

import * as React from "react";
import { Clock, ListOrdered, PlayCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../i18n/context";
import type { QueueSummary } from "./types";

interface SummaryCardsProps {
  summary: QueueSummary;
}

function SummaryCards({ summary }: SummaryCardsProps) {
  const { t } = useI18n();
  const cards = [
    {
      label: t("queue.waitingJobs"),
      value: summary.waitingJobs,
      icon: ListOrdered,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: t("queue.runningJobs"),
      value: summary.runningJobs,
      icon: PlayCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: t("queue.completedToday"),
      value: summary.completedToday,
      icon: CheckCircle2,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: t("queue.avgQueueTime"),
      value:
        summary.avgQueueTimeMinutes > 0
          ? `${summary.avgQueueTimeMinutes}m`
          : "—",
      icon: Clock,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-xl border border-glass-border bg-glass-surface p-4"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}
          >
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-text-muted">
              {card.label}
            </p>
            <p className="text-xl font-bold tracking-tight text-text-primary">
              {card.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export { SummaryCards };
