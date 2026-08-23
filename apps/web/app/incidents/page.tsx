"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, Empty, ErrorBox, Loading } from "../../components/UI";
import { api, dateTime } from "../../lib/api";

export default function Incidents() {
  const [result, setResult] = useState<any>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(
      () =>
        api(
          `/incidents?page=1&pageSize=30&q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}${priority ? `&priority=${priority}` : ""}`,
        )
          .then(setResult)
          .catch((e) => setError(e.message)),
      250,
    );
    return () => clearTimeout(timer);
  }, [q, status, priority]);
  return (
    <AppShell
      title="Quản lý sự cố"
      actions={
        <Link className="button" href="/incidents/new">
          + Báo sự cố
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h2>Danh sách phiếu</h2>
          <p>Tiếp nhận, phân công và theo dõi SLA xử lý.</p>
        </div>
        <Link className="button" href="/incidents/new">
          + Báo sự cố
        </Link>
      </div>
      <div className="filters">
        <input
          placeholder="Tìm mã phiếu hoặc nội dung..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {[
            "NEW",
            "ASSIGNED",
            "IN_PROGRESS",
            "WAITING_FOR_PARTS",
            "AWAITING_CONFIRMATION",
            "COMPLETED",
            "REOPENED",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Mọi mức ưu tiên</option>
          {["URGENT", "HIGH", "MEDIUM", "LOW"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <ErrorBox message={error} />
      {!result ? (
        <Loading />
      ) : result.items.length === 0 ? (
        <Empty />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Nội dung</th>
                <th>Thiết bị / Vị trí</th>
                <th>Ưu tiên</th>
                <th>Kỹ thuật viên</th>
                <th>Hạn xử lý</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/incidents/${item.id}`}>
                      {item.incidentCode}
                    </Link>
                    <br />
                    <span className="muted">{dateTime(item.createdAt)}</span>
                  </td>
                  <td>{item.title}</td>
                  <td>
                    {item.asset?.name}
                    <br />
                    <span className="muted">{item.asset?.location?.name}</span>
                  </td>
                  <td>
                    <Badge value={item.priority} />
                  </td>
                  <td>
                    {item.assignedTechnician?.fullName ?? "Chưa phân công"}
                  </td>
                  <td>{dateTime(item.dueAt)}</td>
                  <td>
                    <Badge value={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
