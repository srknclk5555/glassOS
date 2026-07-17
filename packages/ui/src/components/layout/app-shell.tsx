"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Factory,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Bell,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../lib/cn";
import {
  CommandPalette,
  CommandPaletteContent,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "../ui/command-palette";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown";
import { Sheet, SheetContent } from "../ui/sheet";
import { useTheme } from "../providers/theme-provider";
import { useI18n } from "../../i18n/context";

/* ── Types ─────────────────────────────────────────────────────── */

export interface NavItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  href?: string;
  badge?: string | number;
  active?: boolean;
  disabled?: boolean;
  children?: NavItem[];
  group?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  description?: string;
  read: boolean;
  createdAt: string;
}

/* ── Section name → i18n key mapping ── */
const SECTION_TRANSLATION_KEYS: Record<string, string> = {
  Overview: "navigation.overview",
  Production: "navigation.productionGroup",
  Materials: "navigation.materials",
  Relations: "navigation.relations",
  Facility: "navigation.facility",
  Quality: "navigation.qualityGroup",
  Logistics: "navigation.logistics",
  Analytics: "navigation.analytics",
};

/* ── SidebarNav ────────────────────────────────────────────────── */

interface SidebarNavProps {
  items: NavItem[];
  collapsed: boolean;
  onNavigate: (item: NavItem) => void;
  onLinkClick?: () => void;
}

function SidebarNav({ items, collapsed, onNavigate, onLinkClick }: SidebarNavProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const listRef = React.useRef<HTMLUListElement>(null);

  const toggle = (id: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const onKeyNav = (e: React.KeyboardEvent, item: NavItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (item.children) toggle(item.id);
      else onNavigate(item);
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const btns = listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="treeitem"]',
      );
      if (!btns) return;
      const idx = Array.from(btns).indexOf(e.currentTarget as HTMLButtonElement);
      const next = e.key === "ArrowDown" ? Math.min(idx + 1, btns.length - 1) : Math.max(idx - 1, 0);
      btns[next]?.focus();
    }
    if (e.key === "ArrowRight" && item.children && !expanded.has(item.id)) {
      e.preventDefault();
      toggle(item.id);
    }
    if (e.key === "ArrowLeft" && item.children && expanded.has(item.id)) {
      e.preventDefault();
      toggle(item.id);
    }
  };

  const renderItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    const hasChildren = !!item.children?.length;
    const isExpanded = expanded.has(item.id);

    const isLeaf = !hasChildren && !!item.href && !item.disabled;

    return (
      <li key={item.id} role="none">
        {isLeaf ? (
          <Link
            href={item.href!}
            role="treeitem"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              /* Link handles navigation natively — close panels only */
              onLinkClick?.();
            }}
            onKeyDown={(e) => onKeyNav(e, item)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
              item.active
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-glass-surface-hover hover:text-text-primary",
              collapsed && "justify-center px-2",
              depth > 0 && "pl-7",
            )}
          >
            {Icon && (
              <Icon
                className={cn("h-4 w-4 flex-shrink-0", item.active && "text-primary")}
              />
            )}
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">{t("navigation." + item.id)}</span>
                {item.badge !== undefined && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        ) : (
          <button
            role="treeitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-disabled={item.disabled || undefined}
            tabIndex={0}
            disabled={item.disabled}
            onClick={() => {
              if (hasChildren) toggle(item.id);
              else onNavigate(item);
            }}
            onKeyDown={(e) => onKeyNav(e, item)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150",
              item.active
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:bg-glass-surface-hover hover:text-text-primary",
              item.disabled && "cursor-not-allowed opacity-40",
              collapsed && "justify-center px-2",
              depth > 0 && "pl-7",
            )}
            title={collapsed ? t("navigation." + item.id) : undefined}
          >
            {Icon && (
              <Icon
                className={cn("h-4 w-4 flex-shrink-0", item.active && "text-primary")}
              />
            )}
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-left">{t("navigation." + item.id)}</span>
                {item.badge !== undefined && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                    {item.badge}
                  </span>
                )}
                {hasChildren && (
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 text-text-muted transition-transform duration-150",
                      isExpanded && "rotate-90",
                    )}
                  />
                )}
              </>
            )}
          </button>
        )}
        {hasChildren && !collapsed && isExpanded && (
          <ul role="group" className="mt-0.5 space-y-0.5">
            {item.children!.map((c) => renderItem(c, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const sections = groupBySection(items);

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2" aria-label={t("navigation.sidebarLabel")}>
      <ul ref={listRef} role="tree" className="space-y-1">
        {sections.map(([sectionName, sectionItems]) => (
          <li key={sectionName || "__root"}>
            {!collapsed && sectionName && (
              <div className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                {t(SECTION_TRANSLATION_KEYS[sectionName] ?? sectionName)}
              </div>
            )}
            <ul className="space-y-0.5">
              {sectionItems.map((item) => renderItem(item))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── AppShell ───────────────────────────────────────────────────── */

interface AppShellProps {
  navigation: NavItem[];
  breadcrumbs?: { label: string; href?: string }[];
  user: UserProfile;
  factory?: string;
  notifications?: AppNotification[];
  onNavigate?: (item: NavItem) => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  onMarkNotificationRead?: (id: string) => void;
  onViewAllNotifications?: () => void;
  children: React.ReactNode;
}

function AppShell({
  navigation,
  breadcrumbs = [],
  user,
  factory = "Main Factory",
  notifications = [],
  onNavigate,
  onProfile,
  onSettings,
  onLogout,
  onMarkNotificationRead,
  onViewAllNotifications,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();

  /* Ctrl+K / ⌘K shortcut */
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((p) => !p);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Flatten nav for command palette */
  const flatNav = React.useMemo(() => {
    const r: { id: string; label: string; href?: string; icon?: LucideIcon }[] = [];
    const walk = (items: NavItem[]) => {
      for (const item of items) {
        r.push({ id: item.id, label: item.label, href: item.href, icon: item.icon });
        if (item.children) walk(item.children);
      }
    };
    walk(navigation);
    return r;
  }, [navigation]);

  const filteredNav = searchQuery
    ? flatNav.filter(
        (i) =>
          i.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : flatNav;

  const handleNavigate = (item: NavItem) => {
    onNavigate?.(item);
    setMobileOpen(false);
    setCommandOpen(false);
    setSearchQuery("");
  };

  const handleClosePanels = React.useCallback(() => {
    setMobileOpen(false);
    setCommandOpen(false);
    setSearchQuery("");
  }, []);

  const handlePick = (value: string) => {
    const found = flatNav.find((n) => n.id === value);
    if (found) {
      onNavigate?.({ id: found.id, label: found.label, href: found.href, icon: found.icon });
    }
    setCommandOpen(false);
    setSearchQuery("");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen overflow-hidden bg-glass-background text-text-primary">
      {/* ═══ Desktop Sidebar ═══ */}
      <aside
        className={cn(
          "hidden border-r border-glass-border bg-glass-background transition-all duration-200 md:flex md:flex-col",
          collapsed ? "w-14" : "w-56",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 flex-shrink-0 items-center border-b border-glass-border",
            collapsed ? "justify-center px-2" : "justify-between px-3",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 font-bold tracking-tight",
              collapsed ? "text-sm" : "text-base",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
              G
            </span>
            {!collapsed && <span className="text-text-primary">GlassOS</span>}
          </div>
          <button
            onClick={() => setCollapsed((p) => !p)}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary"
            aria-label={collapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}
          >
            {collapsed ? (
              <PanelLeft className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <SidebarNav items={navigation} collapsed={collapsed} onNavigate={handleNavigate} onLinkClick={handleClosePanels} />
      </aside>

      {/* ═══ Mobile Sidebar (Sheet) ═══ */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-56 p-0" aria-label={t("navigation.navMenuLabel")}>
          <div className="flex h-14 items-center border-b border-glass-border px-3">
            <span className="flex items-center gap-2 text-base font-bold tracking-tight">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                G
              </span>
              <span className="text-text-primary">GlassOS</span>
            </span>
          </div>
          <SidebarNav
            items={navigation}
            collapsed={false}
            onNavigate={(item) => {
              handleNavigate(item);
              setMobileOpen(false);
            }}
            onLinkClick={handleClosePanels}
          />
        </SheetContent>
      </Sheet>

      {/* ═══ Main Area ═══ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── TopBar ── */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-glass-border bg-glass-background px-3 lg:px-5">
          {/* Left: hamburger (mobile) + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary md:hidden"
              aria-label={t("navigation.openNavMenu")}
            >
              <Menu className="h-4 w-4" />
            </button>

            {breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, i) => {
                  const isLast = i === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.label}>
                      {i > 0 && <span className="select-none text-text-muted">/</span>}
                      {isLast ? (
                        <span className="font-medium text-text-primary">{crumb.label}</span>
                      ) : (
                        <span className="text-text-muted transition-colors hover:text-text-secondary">
                          {crumb.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-glass-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-glass-border-hover hover:text-text-secondary"
              aria-label={t("common.searchPlaceholder")}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.searchPlaceholder")}</span>
              <kbd className="hidden rounded border border-glass-border bg-glass-surface px-1.5 py-0.5 text-[10px] font-medium text-text-muted md:inline-block">
                ⌘K
              </kbd>
            </button>

            {/* Factory */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden rounded-md px-2 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-glass-surface-hover hover:text-text-primary sm:flex sm:items-center sm:gap-1.5"
                  aria-label={t("topbar.switchFactory")}
                >
                  <Factory className="h-3.5 w-3.5" />
                  <span className="max-w-[100px] truncate">{factory}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>{t("topbar.factories")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-primary">{factory}</DropdownMenuItem>
                <DropdownMenuItem disabled>Demo Factory #2</DropdownMenuItem>
                <DropdownMenuItem disabled>Demo Factory #3</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-md p-2 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary"
                  aria-label={`${t("topbar.notifications")} (${unreadCount} ${t("topbar.unread")})`}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>{t("topbar.notifications")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-text-muted">{t("common.noNotifications")}</div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => onMarkNotificationRead?.(n.id)}
                      className={cn("flex-col items-start gap-0.5", !n.read && "bg-primary/[0.03]")}
                    >
                      <div className="flex items-center gap-2">
                        {!n.read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />}
                        <span className="text-sm font-medium">{n.title}</span>
                      </div>
                      {n.description && <span className="text-xs text-text-muted">{n.description}</span>}
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewAllNotifications} className="justify-center text-sm text-primary">
                  {t("common.viewAllNotifications")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Language */}
            <button
              onClick={() => setLocale(locale === "tr" ? "en" : "tr")}
              className="rounded-md px-2 py-1 text-xs font-semibold text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary"
              aria-label={t("language.switchLanguage")}
              title={t("language.switchLanguage")}
            >
              {locale === "tr" ? "EN" : "TR"}
            </button>

            {/* Theme */}
            <button
              onClick={toggle}
              className="rounded-md p-2 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary"
              aria-label={theme === "dark" ? t("topbar.themeLight") : t("topbar.themeDark")}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-glass-surface-hover"
                  aria-label={t("topbar.userMenu")}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium leading-tight text-text-primary">{user.name}</p>
                    <p className="text-[10px] text-text-muted">{user.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs font-normal text-text-muted">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onProfile}>{t("topbar.profile")}</DropdownMenuItem>
                <DropdownMenuItem onClick={onSettings}>{t("topbar.settings")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-danger">
                  <LogOut className="mr-2 h-4 w-4" /> {t("topbar.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* ═══ Command Palette ═══ */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandPaletteContent>
          <CommandInput
            placeholder={t("common.searchPlaceholder")}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
          <CommandList>
            {filteredNav.length === 0 && <CommandEmpty>{t("common.noResults")}</CommandEmpty>}
            {filteredNav.length > 0 && (
              <CommandGroup heading="Pages">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem key={item.id} value={item.id} onPick={handlePick}>
                      {Icon && <Icon className="mr-2 h-4 w-4 text-text-muted" />}
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {!searchQuery && (
              <>
                <CommandGroup heading="Recent">
                  <CommandItem value="__recent_1" className="cursor-not-allowed opacity-50">
                    <span className="text-text-muted">{t("common.noRecentPages")}</span>
                  </CommandItem>
                </CommandGroup>
                <CommandGroup heading="Quick Actions">
                  <CommandItem
                    value="__theme_toggle"
                    onPick={() => {
                      toggle();
                      setCommandOpen(false);
                    }}
                  >
                    <Sun className="mr-2 h-4 w-4 text-text-muted" />
                    <span>{t("common.toggleTheme")}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </CommandPaletteContent>
      </CommandPalette>
    </div>
  );
}

/* ── Helper ─────────────────────────────────────────────────────── */

function groupBySection(items: NavItem[]): [string, NavItem[]][] {
  const groups = new Map<string, NavItem[]>();
  const ungrouped: NavItem[] = [];
  for (const item of items) {
    if (item.group) {
      const g = groups.get(item.group) ?? [];
      g.push(item);
      groups.set(item.group, g);
    } else {
      ungrouped.push(item);
    }
  }
  const result: [string, NavItem[]][] = [];
  if (ungrouped.length > 0) result.push(["", ungrouped]);
  for (const [name, gItems] of groups) result.push([name, gItems]);
  return result;
}

export { AppShell };
