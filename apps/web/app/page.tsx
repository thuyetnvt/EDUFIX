"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import { Badge, Empty, ErrorBox, Loading, Stat } from "../components/UI";
import { api, dateTime, money } from "../lib/api";
import { vi } from "../lib/i18n";

type TrendPoint = { date: string; total: number; completed: number };
type Summary = {
  assets: number;
  active: number;
  faulty: number;
  open: number;
  overdue: number;
  onTimeCompletionRate: number;
  averageResponseMinutes: number;
  repairCostThisMonth: number;
  recent: any[];
  upcomingMaintenance: any[];
  incidentsByStatus: Array<{ status: string; _count: number }>;
  incidentsByPriority: Array<{ priority: string; _count: number }>;
  urgentOrOverdue: any[];
};
type FailingAsset = { id: string; assetCode: string; name: string; failureCount: number };

const chartColors = ["#2f6fed", "#16a6bd", "#f2a93b", "#dc5c67", "#7c63d8", "#7f8da6"];

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [failingAssets, setFailingAssets] = useState<FailingAsset[]>([]);
  const [error, setError] = useState("");
  const load = () => {
    setError("");
    return Promise.all([
      api<Summary>("/dashboard/summary"),
      api<TrendPoint[]>("/dashboard/incident-trend"),
      api<FailingAsset[]>("/dashboard/top-failing-assets"),
    ])
      .then(([summary, trendData, assets]) => { setData(summary); setTrend(trendData); setFailingAssets(assets); })
      .catch((e: Error) => setError(e.message));
  };
  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Tổng quan vận hành" actions={<Link className="button" href="/incidents/new">+ Tạo phiếu</Link>}>
      <div className="page-head"><div><h2>Tình hình vận hành</h2><p>Các chỉ số được tổng hợp từ lần tải dữ liệu gần nhất.</p></div></div>
      <ErrorBox message={error} onRetry={() => void load()} />
      {!data ? <Loading /> : <>
        <section className="grid">
          <Stat label="Tổng thiết bị" value={data.assets} note={`${data.active} hoạt động tốt`} />
          <Stat label="Sự cố đang mở" value={data.open} tone="amber" />
          <Stat label="Thiết bị cần xử lý" value={data.faulty} tone="red" />
          <Stat label="Hoàn thành đúng hạn" value={`${data.onTimeCompletionRate}%`} tone="green" />
        </section>
        <section className="dashboard-grid section">
          <div className="card dashboard-wide">
            <div className="card-header"><div><h2>Xu hướng sự cố</h2><span className="muted">30 ngày gần nhất</span></div><Link href="/reports">Xem báo cáo →</Link></div>
            {trend.length === 0 ? <Empty text="Chưa có dữ liệu xu hướng." /> : <div className="chart-box"><ResponsiveContainer width="100%" height={270}><LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" /><XAxis dataKey="date" tickFormatter={(value) => new Date(String(value)).getDate().toString()} tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={(value) => `Ngày ${new Date(String(value)).toLocaleDateString("vi-VN")}`} /><Legend /><Line type="monotone" dataKey="total" name="Tổng phiếu" stroke="#2f6fed" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="completed" name="Đã hoàn tất" stroke="#16a6bd" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>}
          </div>
          <div className="card">
            <div className="card-header"><div><h2>Phân bố ưu tiên</h2><span className="muted">Tất cả phiếu</span></div></div>
            {data.incidentsByPriority.length === 0 ? <Empty text="Chưa có phiếu." /> : <div className="chart-box compact"><ResponsiveContainer width="100%" height={220}><BarChart data={data.incidentsByPriority} layout="vertical" margin={{ left: 15, right: 15 }}><CartesianGrid strokeDasharray="3 3" stroke="#e8edf5" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="priority" tickFormatter={(value) => vi(value, "priority")} width={70} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => [value, "Số phiếu"]} /><Bar dataKey="_count" name="Số phiếu" fill="#2f6fed" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>}
          </div>
        </section>
        <section className="dashboard-grid section">
          <div className="card"><div className="card-header"><h2>Phiếu khẩn cấp / quá hạn</h2><Link href="/incidents">Xem tất cả →</Link></div>{data.urgentOrOverdue.length === 0 ? <Empty text="Không có phiếu cần ưu tiên." /> : data.urgentOrOverdue.map((item) => <Link className="comment dashboard-link" href={`/incidents/${item.id}`} key={item.id}><header><b>{item.incidentCode}</b><Badge value={item.priority} kind="priority" /></header><p>{item.title} · {item.asset?.name}</p><small>{item.dueAt ? `Hạn ${dateTime(item.dueAt)}` : "Chưa có hạn xử lý"}</small></Link>)}</div>
          <div className="card"><div className="card-header"><h2>Phân bố trạng thái</h2></div>{data.incidentsByStatus.length === 0 ? <Empty text="Chưa có phiếu." /> : <div className="chart-box compact"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={data.incidentsByStatus} dataKey="_count" nameKey="status" innerRadius={58} outerRadius={86} paddingAngle={3}>{data.incidentsByStatus.map((item, index) => <Cell key={item.status} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip formatter={(value, name) => [value, vi(String(name), "incidentStatus")]} /><Legend formatter={(value) => vi(String(value), "incidentStatus")} /></PieChart></ResponsiveContainer></div>}</div>
        </section>
        <section className="split section">
          <div className="card"><div className="card-header"><h2>Phiếu sự cố gần đây</h2><Link href="/incidents">Xem tất cả →</Link></div><div className="table-wrap"><table className="table"><thead><tr><th>Mã phiếu</th><th>Nội dung</th><th>Thiết bị</th><th>Kỹ thuật viên</th><th>Trạng thái</th></tr></thead><tbody>{data.recent.length === 0 ? <tr><td colSpan={5}><Empty text="Chưa có phiếu gần đây." /></td></tr> : data.recent.map((item) => <tr key={item.id}><td><Link href={`/incidents/${item.id}`}>{item.incidentCode}</Link></td><td>{item.title}</td><td>{item.asset?.name}</td><td>{item.assignedTechnician?.fullName ?? "Chưa phân công"}</td><td><Badge value={item.status} kind="incidentStatus" /></td></tr>)}</tbody></table></div></div>
          <aside className="card"><div className="card-header"><h2>Hiệu quả xử lý</h2></div><div className="metric-list"><div><div className="metric-line"><span>Đúng hạn</span><b>{data.onTimeCompletionRate}%</b></div><div className="progress"><span style={{ width: `${data.onTimeCompletionRate}%` }} /></div></div><div className="metric-line"><span>Phản hồi trung bình</span><b>{data.averageResponseMinutes} phút</b></div><div className="metric-line"><span>Phiếu quá hạn</span><b>{data.overdue}</b></div><div className="metric-line"><span>Chi phí tháng này</span><b>{money(data.repairCostThisMonth)}</b></div></div><div className="card-header section"><h3>Bảo trì sắp tới</h3></div>{data.upcomingMaintenance.length === 0 ? <Empty text="Không có lịch sắp tới." /> : data.upcomingMaintenance.map((task) => <div className="comment" key={task.id}><b>{task.asset?.name}</b><p>{task.plan?.name} · {dateTime(task.dueAt)}</p></div>)}</aside>
        </section>
        <section className="card section"><div className="card-header"><h2>Thiết bị có nhiều sự cố</h2><Link href="/assets">Quản lý thiết bị →</Link></div>{failingAssets.length === 0 ? <Empty text="Chưa có dữ liệu thiết bị lỗi." /> : <div className="metric-list">{failingAssets.map((asset) => <div className="metric-line" key={asset.id}><span>{asset.assetCode} · {asset.name}</span><b>{asset.failureCount} phiếu</b></div>)}</div>}</section>
      </>}
    </AppShell>
  );
}
