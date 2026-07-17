"use client";

import * as React from "react";
import { Command } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../../lib/cn";

const CommandPalette = DialogPrimitive.Root;

const CommandPaletteTrigger = DialogPrimitive.Trigger;

const CommandPaletteContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-glass-border bg-glass-surface shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
CommandPaletteContent.displayName = "CommandPaletteContent";

/* ── Command Input ──────────────────────────────────────────────── */

interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center border-b border-glass-border px-3">
      <Command className="mr-2 h-4 w-4 shrink-0 text-text-muted" />
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
CommandInput.displayName = "CommandInput";

/* ── Command List ───────────────────────────────────────────────── */

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto p-1", className)}
    {...props}
  />
));
CommandList.displayName = "CommandList";

/* ── Command Group ──────────────────────────────────────────────── */

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { heading?: string }
>(({ className, heading, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("overflow-hidden", className)}
    {...props}
  >
    {heading && (
      <div className="px-2 py-1.5 text-xs font-medium text-text-muted">
        {heading}
      </div>
    )}
    {children}
  </div>
));
CommandGroup.displayName = "CommandGroup";

/* ── Command Item ───────────────────────────────────────────────── */

interface CommandItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onPick?: (value: string) => void;
  value?: string;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, onPick, value, children, ...props }, ref) => (
    <div
      ref={ref}
      role="option"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm text-text-primary outline-none",
        "hover:bg-glass-surface-hover",
        "aria-selected:bg-glass-surface-hover",
        className,
      )}
      onClick={() => onPick?.(value ?? "")}
      {...props}
    >
      {children}
    </div>
  ),
);
CommandItem.displayName = "CommandItem";

/* ── Command Empty ──────────────────────────────────────────────── */

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-6 text-center text-sm text-text-muted", className)}
    {...props}
  />
));
CommandEmpty.displayName = "CommandEmpty";

export {
  CommandPalette,
  CommandPaletteTrigger,
  CommandPaletteContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
};
