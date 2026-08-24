"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, UserCircle, X } from "lucide-react";
import { api, clearSession, CurrentUser, getCurrentUser } from "../lib/api";
import { canAccessPath, homeForRole, itemsForRole, mobileItemsForRole, schoolName } from "../lib/navigation";
import { vi } from "../lib/i18n";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function AppShell({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [authError, setAuthError] = useState("");
  const links = useMemo(() => itemsForRole(user?.role), [user?.role]);

  useEffect(() => {
    let alive = true;
    getCurrentUser()
      .then((currentUser) => { if (alive) setUser(currentUser); })
      .catch((error: unknown) => {
        if (!alive) return;
        setAuthError(error instanceof Error ? error.message : "Phiên đăng nhập không hợp lệ");
        clearSession();
        router.replace("/login");
      });
    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<any[]>("/notifications")
      .then((notifications) => {
        if (alive) setUnread(notifications.filter((notification) => !notification.readAt).length);
      })
      .catch(() => {
        // Thông báo là dữ liệu phụ, không được làm mất phiên đăng nhập.
        if (alive) setUnread(0);
      });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (user && pathname && !canAccessPath(user.role, pathname)) router.replace(homeForRole(user.role));
  }, [pathname, router, user]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: localStorage.getItem("edufix_refresh_token") }) });
    } catch {
      // Xóa phiên cục bộ ngay cả khi máy chủ tạm thời không phản hồi.
    }
    clearSession();
    router.replace("/login");
  }

  const breadcrumb = pathname.split("/").filter(Boolean).map((part) => part.replaceAll("-", " "));
  if (authError) return null;

  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <Link href={user ? homeForRole(user.role) : "/login"} className="brand"><span>E</span> EduFix</Link>
          <button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={18} /></button>
        </div>
        <div className="workspace"><small>Không gian làm việc</small><strong>{schoolName()}</strong></div>
        <nav className="nav" aria-label="Điều hướng chính">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} className={isActive(pathname, href) ? "active" : ""} href={href} onClick={() => setOpen(false)}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link href="/notifications" className={isActive(pathname, "/notifications") ? "active" : ""}>
            <Bell size={18} aria-hidden="true" /><span>Thông báo</span>
            {unread > 0 && <b className="notification-count">{unread > 99 ? "99+" : unread}</b>}
          </Link>
          <button onClick={() => void logout()}><LogOut size={18} aria-hidden="true" /><span>Đăng xuất</span></button>
        </div>
      </aside>
      {open && <button aria-label="Đóng menu" className="overlay" onClick={() => setOpen(false)} />}
      <main className="main">
        <header className="topbar">
          <div className="top-title">
            <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu size={20} /></button>
            <div>
              <p className="eyebrow">VẬN HÀNH EDUFIX</p><h1>{title}</h1>
              <div className="breadcrumb" aria-label="Breadcrumb"><Link href={user ? homeForRole(user.role) : "/"}>EduFix</Link>{breadcrumb.map((part) => <span key={part}><ChevronRight size={13} /> {part}</span>)}</div>
            </div>
          </div>
          <div className="top-actions">
            {actions}
            <Link className="notification-button" href="/notifications" aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`}><Bell size={19} />{unread > 0 && <b className="notification-count">{unread > 99 ? "99+" : unread}</b>}</Link>
            <div className="profile-wrap">
              <button className="profile-trigger" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}>
                <span className="user-avatar">{user?.fullName?.slice(0, 1) ?? "…"}</span><span className="user"><strong>{user?.fullName ?? "Đang tải"}</strong><span>{user?.role ? vi(user.role, "role") : ""}</span></span><ChevronDown size={16} />
              </button>
              {profileOpen && <div className="profile-menu"><div className="profile-summary"><UserCircle size={18} /><span>{user?.email}</span></div><button onClick={() => void logout()}><LogOut size={16} /> Đăng xuất</button></div>}
            </div>
          </div>
        </header>
        {children}
      </main>
      {user && (user.role === "REPORTER" || user.role === "TECHNICIAN") && (
        <nav className="mobile-bottom" aria-label="Điều hướng di động">
          {mobileItemsForRole(user.role).map((href) => {
            const item = links.find((link) => link.href === href);
            const Icon = item?.icon ?? Bell;
            return <Link key={href} href={href} className={isActive(pathname, href) ? "active" : ""}><Icon size={18} aria-hidden="true" /><span>{item?.label ?? "Thông báo"}</span></Link>;
          })}
        </nav>
      )}
    </div>
  );
}
