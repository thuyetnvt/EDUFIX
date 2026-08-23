"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { Badge, ErrorBox, Loading, Stat } from "../components/UI";
import { api, dateTime, money } from "../lib/api";
import { vi } from "../lib/i18n";

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
};
type TrendPoint = { date: string; total: number; completed: number };
type FailingAsset = {
  id: string;
  assetCode: string;
  name: string;
  failureCount: number;
};
export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [failingAssets, setFailingAssets] = useState<FailingAsset[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<Summary>("/dashboard/summary"),
      api<TrendPoint[]>("/dashboard/incident-trend"),
      api<FailingAsset[]>("/dashboard/top-failing-assets"),
    ])
      .then(([summary, trendData, assets]) => {
        setData(summary);
        setTrend(trendData);
        setFailingAssets(assets);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <AppShell
      title="Tổng quan vận hành"
      actions={
        <Link className="button" href="/incidents/new">
          + Tạo phiếu
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h2>Tình hình hôm nay</h2>
          <p>
            Các chỉ số tài sản và sự cố được tổng hợp từ lần tải dữ liệu gần
            nhất.
          </p>
        </div>
      </div>
      <ErrorBox message={error} />
      {!data ? (
        <Loading />
      ) : (
        <>
          <section className="grid">
            <Stat
              label="Tổng thiết bị"
              value={data.assets}
              note={`${data.active} hoạt động tốt`}
            />
            <Stat label="Sự cố đang mở" value={data.open} tone="amber" />
            <Stat label="Thiết bị cần xử lý" value={data.faulty} tone="red" />
            <Stat
              label="Hoàn thành đúng hạn"
              value={`${data.onTimeCompletionRate}%`}
              tone="green"
            />
          </section>
          <section className="split section">
            <div className="card">
              <div className="card-header">
                <h2>Phiếu sự cố gần đây</h2>
                <Link href="/incidents">Xem tất cả →</Link>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Nội dung</th>
                      <th>Thiết bị</th>
                      <th>Kỹ thuật viên</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/incidents/${item.id}`}>
                            {item.incidentCode}
                          </Link>
                        </td>
                        <td>{item.title}</td>
                        <td>{item.asset?.name}</td>
                        <td>
                          {item.assignedTechnician?.fullName ??
                            "Chưa phân công"}
                        </td>
                        <td>
                          <Badge value={item.status} kind="incidentStatus" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <aside className="card">
              <div className="card-header">
                <h2>Hiệu quả xử lý</h2>
              </div>
              <div className="metric-list">
                <div>
                  <div className="metric-line">
                    <span>Đúng hạn</span>
                    <b>{data.onTimeCompletionRate}%</b>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${data.onTimeCompletionRate}%` }} />
                  </div>
                </div>
                <div className="metric-line">
                  <span>Phản hồi trung bình</span>
                  <b>{data.averageResponseMinutes} phút</b>
                </div>
                <div className="metric-line">
                  <span>Phiếu quá hạn</span>
                  <b>{data.overdue}</b>
                </div>
                <div className="metric-line">
                  <span>Chi phí tháng này</span>
                  <b>{money(data.repairCostThisMonth)}</b>
                </div>
              </div>
              <div className="card-header section">
                <h3>Bảo trì sắp tới</h3>
              </div>
              {data.upcomingMaintenance.map((task) => (
                <div className="comment" key={task.id}>
                  <b>{task.asset?.name}</b>
                  <p>
                    {task.plan?.name} · {dateTime(task.dueAt)}
                  </p>
                </div>
              ))}
            </aside>
          </section>
          <section className="split section">
            <div className="card">
              <div className="card-header">
                <h2>Xu hướng 30 ngày</h2>
                <span className="muted">Tổng phiếu / đã hoàn tất</span>
              </div>
              <div className="trend-chart" aria-label="Biểu đồ xu hướng sự cố">
                {trend.map((point) => (
                  <div
                    className="trend-column"
                    key={point.date}
                    title={`${point.date}: ${point.total} phiếu`}
                  >
                    <span
                      style={{ height: `${Math.max(4, point.total * 12)}px` }}
                    />
                    <small>{new Date(point.date).getDate()}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header">
                <h2>Thiết bị có nhiều sự cố</h2>
              </div>
              <div className="metric-list">
                {failingAssets.length === 0 ? (
                  <span className="muted">Chưa có dữ liệu.</span>
                ) : (
                  failingAssets.map((asset) => (
                    <div className="metric-line" key={asset.id}>
                      <span>
                        {asset.assetCode} · {asset.name}
                      </span>
                      <b>{asset.failureCount}</b>
                    </div>
                  ))
                )}
              </div>
              <div className="card-header section">
                <h3>Phân bố trạng thái</h3>
              </div>
              <div className="metric-list">
                {data.incidentsByStatus.map((item) => (
                  <div className="metric-line" key={item.status}>
                    <span>{vi(item.status, "incidentStatus")}</span>
                    <b>{item._count}</b>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
