import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardList,
  Home,
  MapPin,
  Package,
  QrCode,
  ScrollText,
  Users,
  Wrench,
} from "lucide-react";
import type { CurrentUser } from "./api";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: CurrentUser["role"][];
};

const managers: CurrentUser["role"][] = ["ADMIN", "FACILITY_MANAGER"];

export const navigation: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: Home, roles: managers },
  { href: "/assets", label: "Thiết bị", icon: Boxes, roles: managers },
  { href: "/incidents", label: "Sự cố", icon: AlertTriangle, roles: ["ADMIN", "FACILITY_MANAGER", "TECHNICIAN"] },
  { href: "/locations", label: "Vị trí", icon: MapPin, roles: managers },
  { href: "/maintenance", label: "Bảo trì", icon: CalendarDays, roles: managers },
  { href: "/inventory", label: "Kho vật tư", icon: Package, roles: managers },
  { href: "/reports", label: "Báo cáo", icon: BarChart3, roles: managers },
  { href: "/users", label: "Người dùng", icon: Users, roles: managers },
  { href: "/audit-logs", label: "Nhật ký hệ thống", icon: ScrollText, roles: ["ADMIN"] },
  { href: "/mobile/home", label: "Trang chủ", icon: Home, roles: ["REPORTER"] },
  { href: "/mobile/scan", label: "Quét QR", icon: QrCode, roles: ["REPORTER"] },
  { href: "/mobile/my-incidents", label: "Phiếu của tôi", icon: ClipboardList, roles: ["REPORTER"] },
  { href: "/technician/home", label: "Công việc", icon: Home, roles: ["TECHNICIAN"] },
  { href: "/technician/maintenance", label: "Bảo trì", icon: Wrench, roles: ["TECHNICIAN"] },
];

export const utilityRoutes = ["/notifications"];
const reporterMobileItems = ["/mobile/home", "/mobile/scan", "/mobile/my-incidents", "/notifications"];
const technicianMobileItems = ["/technician/home", "/incidents", "/technician/maintenance", "/notifications"];

export function mobileItemsForRole(role: CurrentUser["role"] | undefined) {
  return role === "TECHNICIAN" ? technicianMobileItems : reporterMobileItems;
}

export function itemsForRole(role: CurrentUser["role"] | undefined) {
  return navigation.filter((item) => !!role && item.roles.includes(role));
}

export function canAccessPath(role: CurrentUser["role"], pathname: string) {
  const itemAllowed = navigation.some(
    (item) => item.roles.includes(role) && (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))),
  );
  const reporterIncidentRoute = role === "REPORTER" &&
    (pathname === "/incidents/new" || pathname.startsWith("/incidents/") || pathname.startsWith("/scan/"));
  const technicianTaskRoute = role === "TECHNICIAN" && (pathname === "/maintenance" || pathname.startsWith("/maintenance/tasks/"));
  return itemAllowed || utilityRoutes.includes(pathname) || reporterIncidentRoute || technicianTaskRoute;
}

export function homeForRole(role: CurrentUser["role"]) {
  if (role === "REPORTER") return "/mobile/home";
  if (role === "TECHNICIAN") return "/technician/home";
  return "/";
}

export function schoolName() {
  return process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Trường học EduFix";
}
