import {
  LayoutDashboard,
  ClipboardList,
  Cog,
  ListOrdered,
  Package,
  Users,
  BookOpen,
  Factory,
  MapPin,
  ShieldCheck,
  Truck,
  BarChart3,
  Settings,
} from "lucide-react";
import type { NavItem } from "@repo/ui";

export const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", group: "Overview" },
  { id: "orders", label: "Orders", icon: ClipboardList, href: "/orders", group: "Production" },
  { id: "production", label: "Production", icon: Cog, href: "/production", group: "Production" },
  { id: "queue", label: "Queue", icon: ListOrdered, href: "/queue", group: "Production" },
  { id: "inventory", label: "Inventory", icon: Package, href: "/inventory", group: "Materials" },
  { id: "customers", label: "Customers", icon: Users, href: "/customers", group: "Relations" },
  { id: "recipes", label: "Recipes", icon: BookOpen, href: "/recipes", group: "Production" },
  { id: "machines", label: "Machines", icon: Factory, href: "/machines", group: "Facility" },
  { id: "stations", label: "Stations", icon: MapPin, href: "/stations", group: "Facility" },
  { id: "personnel", label: "Personnel", icon: Users, href: "/personnel", group: "Facility" },
  { id: "quality", label: "Quality", icon: ShieldCheck, href: "/quality", group: "Quality" },
  { id: "dispatch", label: "Dispatch", icon: Truck, href: "/dispatch", group: "Logistics" },
  { id: "reports", label: "Reports", icon: BarChart3, href: "/reports", group: "Analytics" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];
