"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/badge";

interface FactoryBadgeProps {
  name: string;
  location?: string;
  className?: string;
}

function FactoryBadge({ name, location, className }: FactoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5 font-normal", className)}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
      {name}
      {location && (
        <span className="text-text-muted">· {location}</span>
      )}
    </Badge>
  );
}

export { FactoryBadge };
