"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, CurrentUser, getCurrentUser } from "../lib/api";
import { vi } from "../lib/i18n";

const managerLinks = [
  ["/", "Tổng quan", "⌂"],
  ["/assets", "Thiết bị", "▣"],
  ["/incidents", "Sự cố", "⚠"],
  ["/locations", "Vị trí", "⌖"],
  ["/maintenance", "Bảo trì", "◷"],
  ["/inventory", "Kho vật tư", "▤"],
  ["/reports", "Báo cáo", "▥"],
  ["/users", "Người dùng", "♙"],
];
const adminLinks = [...managerLinks, ["/audit-logs", "Nhật ký", "≡"]];
const reporterLinks = [
  ["/mobile/home", "Trang chủ", "⌂"],
  ["/mobile/scan", "Quét QR", "⌗"],
  ["/mobile/my-incidents", "Phiếu của tôi", "⚠"],
];
const technicianLinks = [
  ["/technician/home", "Công việc", "⌂"],
  ["/incidents", "Phiếu được giao", "⚒"],
  ["/technician/maintenance", "Bảo trì", "◷"],
];

export default function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        return api<any[]>("/notifications");
      })
      .then((notifications) =>
        setUnread(
          notifications.filter((notification) => !notification.readAt).length,
        ),
      )
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);
  const links =
    user?.role === "REPORTER"
      ? reporterLinks
      : user?.role === "TECHNICIAN"
        ? technicianLinks
        : user?.role === "ADMIN"
          ? adminLinks
          : managerLinks;
  useEffect(() => {
    if (!user) return;
    const allowed =
      user.role === "REPORTER"
        ? [
            "/mobile/home",
            "/mobile/scan",
            "/mobile/my-incidents",
            "/notifications",
          ]
        : user.role === "TECHNICIAN"
          ? [
              "/technician/home",
              "/technician/maintenance",
              "/incidents",
              "/notifications",
            ]
          : user.role === "ADMIN"
            ? [
                "/",
                "/assets",
                "/incidents",
                "/locations",
                "/maintenance",
                "/inventory",
                "/reports",
                "/users",
                "/audit-logs",
                "/notifications",
              ]
            : [
                "/",
                "/assets",
                "/incidents",
                "/locations",
                "/maintenance",
                "/inventory",
                "/reports",
                "/users",
                "/notifications",
              ];
    if (
      !allowed.some(
        (path) =>
          pathname === path || (path !== "/" && pathname.startsWith(path)),
      )
    )
      router.replace(
        user.role === "REPORTER"
          ? "/mobile/home"
          : user.role === "TECHNICIAN"
            ? "/technician/home"
            : "/",
      );
  }, [pathname, router, user]);
  async function logout() {
    try {
      await api("/auth/logout", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: localStorage.getItem("edufix_refresh_token"),
        }),
      });
    } catch {
      // Vẫn xóa phiên cục bộ nếu máy chủ đang ngoại tuyến.
    }
    clearSession();
    router.replace("/login");
  }
  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand">
            <span>E</span> EduFix
          </Link>
          <button
            className="icon-button close-menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="workspace">
          <small>Không gian làm việc</small>
          <strong>Trường Đại học Demo</strong>
        </div>
        <nav className="nav">
          {links.map(([href, label, icon]) => (
            <Link
              key={href}
              className={
                pathname === href || (href !== "/" && pathname.startsWith(href))
                  ? "active"
                  : ""
              }
              href={href}
              onClick={() => setOpen(false)}
            >
              <i>{icon}</i>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href="/notifications">
            🔔 <span>Thông báo</span>
            {unread > 0 && (
              <b className="notification-count">
                {unread > 99 ? "99+" : unread}
              </b>
            )}
          </Link>
          <button onClick={logout}>
            ↪ <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Đóng menu"
          className="overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <div className="top-title">
            <button
              className="icon-button menu-button"
              onClick={() => setOpen(true)}
            >
              ☰
            </button>
            <div>
              <p className="eyebrow">VẬN HÀNH EDUFIX</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="top-actions">
            {actions}
            <Link
              className="notification-button"
              href="/notifications"
              aria-label="Thông báo"
            >
              🔔
              {unread > 0 && (
                <b className="notification-count">
                  {unread > 99 ? "99+" : unread}
                </b>
              )}
            </Link>
            <div className="user-avatar">
              {user?.fullName?.slice(0, 1) ?? "…"}
            </div>
            <div className="user">
              <strong>{user?.fullName ?? "Đang tải"}</strong>
              <span>{user?.role ? vi(user.role, "role") : ""}</span>
            </div>
          </div>
        </header>
        {children}
      </main>
      {user && ["REPORTER", "TECHNICIAN"].includes(user.role) && (
        <nav className="mobile-bottom" aria-label="Điều hướng di động">
          {links.slice(0, 3).map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? "active" : ""}
            >
              <i>{icon}</i>
              <span>{label}</span>
            </Link>
          ))}
          <Link
            href="/notifications"
            className={pathname === "/notifications" ? "active" : ""}
          >
            <i>🔔</i>
            <span>Thông báo</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
