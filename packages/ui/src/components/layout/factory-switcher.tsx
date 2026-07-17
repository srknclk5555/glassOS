"use client";

import * as React from "react";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown";

interface Factory {
  id: string;
  name: string;
  location?: string;
}

interface FactorySwitcherProps {
  factories: Factory[];
  activeFactoryId?: string;
  onSwitch: (factoryId: string) => void;
  className?: string;
}

function FactorySwitcher({
  factories,
  activeFactoryId,
  onSwitch,
  className,
}: FactorySwitcherProps) {
  const activeFactory = factories.find((f) => f.id === activeFactoryId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary transition-colors hover:bg-glass-surface-hover",
            className,
          )}
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium">{activeFactory?.name ?? "Select Factory"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {factories.map((factory) => (
          <DropdownMenuItem
            key={factory.id}
            onClick={() => onSwitch(factory.id)}
            className={cn(
              factory.id === activeFactoryId && "bg-primary/10 text-primary",
            )}
          >
            <Building2 className="h-4 w-4" />
            <div className="flex flex-col">
              <span>{factory.name}</span>
              {factory.location && (
                <span className="text-xs text-text-muted">{factory.location}</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { FactorySwitcher };
