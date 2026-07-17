"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown";

interface Notification {
  id: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onViewAll: () => void;
  className?: string;
}

function Notifications({
  notifications,
  onMarkRead,
  onViewAll,
  className,
}: NotificationsProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative rounded-md p-2 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary",
            className,
          )}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-text-muted">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 5).map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              className={cn("flex-col items-start gap-0.5", !n.read && "bg-primary/5")}
            >
              <div className="flex items-center gap-2">
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="text-sm font-medium">{n.title}</span>
              </div>
              {n.description && (
                <span className="text-xs text-text-muted">{n.description}</span>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onViewAll} className="justify-center text-sm text-primary">
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { Notifications, type Notification };
