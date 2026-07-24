// ── Lib ──────────────────────────────────────────────────────────
export { cn } from "./lib/cn";

// ── I18n ─────────────────────────────────────────────────────────
export { I18nProvider, useI18n } from "./i18n/context";
export type { TranslationDict, SupportedLocale } from "./i18n/types";

// ── Providers ────────────────────────────────────────────────────
export { ThemeProvider, useTheme } from "./components/providers/theme-provider";
export type { Theme } from "./components/providers/theme-provider";

// ── Auth ─────────────────────────────────────────────────────────
export { AuthProvider, AuthContext, useAuth } from "./components/auth/auth-context";
export type { AuthUser, AuthContextValue, LoginResult } from "./components/auth/auth-context";
export { LoginPage } from "./components/auth/login-page";
export { AuthGuard } from "./components/auth/auth-guard";
export { Error401, Error403, Error404 } from "./components/auth/error-pages";

// ── Hooks ────────────────────────────────────────────────────────
export { useNavItems } from "./hooks/use-nav-items";

// ── UI Components ────────────────────────────────────────────────
export { Button, buttonVariants } from "./components/ui/button";
export type { ButtonProps } from "./components/ui/button";

export { Input } from "./components/ui/input";
export type { InputProps } from "./components/ui/input";

export { Textarea } from "./components/ui/textarea";
export type { TextareaProps } from "./components/ui/textarea";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
} from "./components/ui/select";

export { Checkbox } from "./components/ui/checkbox";

export { Switch } from "./components/ui/switch";

export { Badge, badgeVariants } from "./components/ui/badge";
export type { BadgeProps } from "./components/ui/badge";
export { Combobox } from "./components/ui/combobox";
export type { ComboboxOption, ComboboxProps } from "./components/ui/combobox";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./components/ui/drawer";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./components/ui/tabs";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
} from "./components/ui/dropdown";

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./components/ui/tooltip";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./components/ui/toast";
export type { ToastProps, ToastActionElement } from "./components/ui/toast";

export { Skeleton } from "./components/ui/skeleton";

export { EmptyState } from "./components/ui/empty-state";

export { LoadingState } from "./components/ui/loading-state";

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "./components/ui/avatar";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";

export { SearchBox } from "./components/ui/search-box";

export {
  CommandPalette,
  CommandPaletteTrigger,
  CommandPaletteContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "./components/ui/command-palette";

export { StatusIndicator } from "./components/ui/status-indicator";

export { Progress } from "./components/ui/progress";

// ── Domain Badges ────────────────────────────────────────────────
export { GlassStatusBadge } from "./components/ui/glass-status-badge";
export type { GlassStatus } from "./components/ui/glass-status-badge";

export { PriorityBadge } from "./components/ui/priority-badge";
export type { PriorityLevel } from "./components/ui/priority-badge";

export { ProductionStatusBadge } from "./components/ui/production-status-badge";
export type { ProductionStatus } from "./components/ui/production-status-badge";

export { FactoryBadge } from "./components/ui/factory-badge";

// ── DataGrid ─────────────────────────────────────────────────────
export { DataGrid } from "./components/data-grid/data-grid";
export type { Column, DataGridProps } from "./components/data-grid/data-grid";

// ── Layout ───────────────────────────────────────────────────────
export { AppShell } from "./components/layout/app-shell";
export type { NavItem, UserProfile, AppNotification } from "./components/layout/app-shell";
export { Shell } from "./components/layout/shell";
export { Sidebar } from "./components/layout/sidebar";
export type { SidebarItem } from "./components/layout/sidebar";
export { TopBar } from "./components/layout/topbar";
export type { BreadcrumbItem as TopbarBreadcrumbItem } from "./components/layout/topbar";
export { Notifications } from "./components/layout/notifications";
export type { Notification } from "./components/layout/notifications";
export { Profile } from "./components/layout/profile";
export { FactorySwitcher } from "./components/layout/factory-switcher";
export { ThemeSwitcher } from "./components/layout/theme-switcher";

// ── Queue (Production Queue) ─────────────────────────────────────
export { SummaryCards } from "./components/queue/summary-cards";
export { QueueFilters } from "./components/queue/queue-filters";
export { QueueCard } from "./components/queue/queue-card";
export { ActiveWorkPanel } from "./components/queue/active-work-panel";
export { BarcodeScanner } from "./components/queue/barcode-scanner";
export { DetailDrawer } from "./components/queue/detail-drawer";
export { ProductionQueuePage } from "./components/queue/production-queue-page";
export type {
  QueueJobItem,
  StationFilter,
  MachineFilter,
  OperationFilter,
  ActiveWorkItem,
  QueueSummary,
  QueueDetail,
  TimelineEvent,
  QueueFiltersState,
  ProductionQueuePageData,
} from "./components/queue";
