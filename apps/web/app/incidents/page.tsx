"use client";

import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, Empty, ErrorBox, Loading } from "../../components/UI";
import { api, dateTime, getCurrentUser } from "../../lib/api";
import { vi } from "../../lib/i18n";

const statuses = ["NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_PARTS", "AWAITING_CONFIRMATION", "REOPENED", "COMPLETED", "CANCELLED"];
const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export default function Incidents() {
  const [result, setResult] = useState<any>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [techs, setTechs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const pageSize = view === "kanban" ? 100 : 12;

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (["ADMIN", "FACILITY_MANAGER"].includes(user.role)) api<any[]>("/users?role=TECHNICIAN").then(setTechs).catch(() => undefined);
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (q) params.set("q", q); if (status) params.set("status", status); if (priority) params.set("priority", priority); if (technicianId) params.set("technicianId", technicianId); if (dateFrom) params.set("dateFrom", dateFrom); if (dateTo) params.set("dateTo", dateTo); if (overdue) params.set("overdue", "true");
      setError(""); api(`/incidents?${params}`).then(setResult).catch((e: Error) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, status, priority, technicianId, dateFrom, dateTo, overdue, page, pageSize]);

  function resetFilters() { setQ(""); setStatus(""); setPriority(""); setTechnicianId(""); setDateFrom(""); setDateTo(""); setOverdue(false); setPage(1); }
  const items = result?.items ?? [];
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return <AppShell title="Quản lý sự cố" actions={<Link className="button" href="/incidents/new">+ Báo sự cố</Link>}>
    <div className="page-head"><div><h2>Danh sách phiếu</h2><p>Tiếp nhận, phân công và theo dõi SLA xử lý.</p></div><div className="view-toggle"><button className={view === "table" ? "active" : ""} onClick={() => { setView("table"); setPage(1); }} aria-label="Xem dạng bảng"><List size={16} /> Bảng</button><button className={view === "kanban" ? "active" : ""} onClick={() => { setView("kanban"); setPage(1); }} aria-label="Xem dạng Kanban"><LayoutGrid size={16} /> Kanban</button></div></div>
    <div className="filters incident-filters"><label className="filter-search"><Search size={16} /><input placeholder="Tìm mã phiếu hoặc nội dung..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">Mọi trạng thái</option>{statuses.map((x) => <option key={x} value={x}>{vi(x, "incidentStatus")}</option>)}</select><select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }}><option value="">Mọi mức ưu tiên</option>{priorities.map((x) => <option key={x} value={x}>{vi(x, "priority")}</option>)}</select>{techs.length > 0 && <select value={technicianId} onChange={(e) => { setTechnicianId(e.target.value); setPage(1); }}><option value="">Mọi kỹ thuật viên</option>{techs.map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select>}<label className="date-filter">Từ <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} /></label><label className="date-filter">Đến <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} /></label><label className="check-filter"><input type="checkbox" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); setPage(1); }} /> Quá hạn</label><button className="button secondary filter-reset" onClick={resetFilters}>Xóa lọc</button></div>
    <ErrorBox message={error} onRetry={() => setPage(page)} />
    {!result ? <Loading /> : items.length === 0 ? <Empty text="Thử thay đổi bộ lọc hoặc tạo phiếu mới." action={<Link className="button" href="/incidents/new">Báo sự cố</Link>} /> : view === "kanban" ? <div className="kanban">{statuses.filter((column) => items.some((item: any) => item.status === column)).map((column) => <section className="kanban-column" key={column}><header><b>{vi(column, "incidentStatus")}</b><span>{items.filter((item: any) => item.status === column).length}</span></header>{items.filter((item: any) => item.status === column).map((item: any) => <Link className="kanban-card" href={`/incidents/${item.id}`} key={item.id}><div><b>{item.incidentCode}</b><Badge value={item.priority} kind="priority" /></div><strong>{item.title}</strong><small>{item.asset?.name}</small><span>{item.assignedTechnician?.fullName ?? "Chưa phân công"}</span></Link>)}</section>)}</div> : <div className="table-wrap responsive-table"><table className="table"><thead><tr><th>Mã phiếu</th><th>Nội dung</th><th>Thiết bị / Vị trí</th><th>Ưu tiên</th><th>Kỹ thuật viên</th><th>Hạn xử lý</th><th>Trạng thái</th></tr></thead><tbody>{items.map((item: any) => <tr key={item.id}><td><Link href={`/incidents/${item.id}`}>{item.incidentCode}</Link><br /><span className="muted">{dateTime(item.createdAt)}</span></td><td>{item.title}</td><td>{item.asset?.name}<br /><span className="muted">{item.asset?.location?.name}</span></td><td><Badge value={item.priority} kind="priority" /></td><td>{item.assignedTechnician?.fullName ?? "Chưa phân công"}</td><td>{dateTime(item.dueAt)}</td><td><Badge value={item.status} kind="incidentStatus" /></td></tr>)}</tbody></table></div>}
    {result && pages > 1 && <div className="pagination"><span>Trang {result.page}/{pages} · {result.total} phiếu</span><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button><button className="button secondary" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Sau</button></div>}
  </AppShell>;
}
