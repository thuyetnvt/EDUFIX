"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, CurrentUser, getCurrentUser } from "../lib/api";

const managerLinks = [
  ["/", "Tổng quan", "⌂"],
  ["/assets", "Thiết bị", "▣"],
  ["/incidents", "Sự cố", "⚠"],
  ["/locations", "Vị trí", "⌖"],
  ["/maintenance", "Bảo trì", "◷"],
  ["/inventory", "Kho vật tư", "▤"],
  ["/reports", "Báo cáo", "▥"],
  ["/users", "Người dùng", "♙"],
  ["/audit-logs", "Nhật ký", "≡"],
];
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
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
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
        : managerLinks;
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
              <p className="eyebrow">EDUFIX OPERATIONS</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="top-actions">
            {actions}
            <Link className="notification-button" href="/notifications">
              🔔
            </Link>
            <div className="user-avatar">
              {user?.fullName?.slice(0, 1) ?? "…"}
            </div>
            <div className="user">
              <strong>{user?.fullName ?? "Đang tải"}</strong>
              <span>{user?.role ? user.role.replaceAll("_", " ") : ""}</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
