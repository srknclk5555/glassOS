"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "../../lib/cn";
import { useTheme } from "../providers/theme-provider";
import { Button } from "../ui/button";

interface ThemeSwitcherProps {
  className?: string;
  variant?: "icon" | "full";
}

function ThemeSwitcher({ className, variant = "icon" }: ThemeSwitcherProps) {
  const { theme, toggle } = useTheme();

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className={cn("gap-2", className)}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </Button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "rounded-md p-2 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary",
        className,
      )}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}

export { ThemeSwitcher };
