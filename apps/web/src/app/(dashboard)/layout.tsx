"use client";

import { useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AppShell,
  AuthGuard,
  useAuth,
  useNavItems,
  useI18n,
  type UserProfile,
  type AppNotification,
} from "@repo/ui";
import { ALL_NAV_ITEMS } from "@/lib/navigation";

/** Build breadcrumbs from the current pathname */
function useBreadcrumbs(t: (key: string) => string): { label: string; href?: string }[] {
  const pathname = usePathname();
  return useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [{ label: t("topbar.breadcrumbHome") }];
    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      // Try to look up a translated page name; fall back to capitalized segment
      const translated = t(`pages.${seg}`);
      crumbs.push({
        label: translated !== `pages.${seg}` ? translated : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
        href: acc,
      });
    }
    return crumbs;
  }, [pathname, t]);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const breadcrumbs = useBreadcrumbs(t);

  const filteredNav = useNavItems(ALL_NAV_ITEMS, user?.role ?? null);

  const userProfile: UserProfile = user
    ? {
        name: user.name,
        email: user.email,
        avatar: user.image ?? "",
      }
    : { name: "", email: "" };

  const notifications: AppNotification[] = [];

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <AuthGuard
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      onRedirectToLogin={() => router.push("/login")}
    >
      <AppShell
        navigation={filteredNav}
        breadcrumbs={breadcrumbs}
        user={userProfile}
        factory="Main Factory"
        notifications={notifications}
        onNavigate={(item) => {
          if (item.href && item.href !== pathname) {
            router.push(item.href);
          }
        }}
        onLogout={handleLogout}
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}
