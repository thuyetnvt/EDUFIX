"use client";
import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { ErrorBox, Loading } from "../../components/UI";
import { api, dateTime } from "../../lib/api";
import { vi } from "../../lib/i18n";
export default function AuditLogs() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<any[]>("/audit-logs")
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <AppShell title="Nhật ký kiểm toán">
      <div className="page-head">
        <div>
          <h2>Lịch sử thay đổi</h2>
          <p>Dữ liệu chỉ đọc dành cho quản trị viên.</p>
        </div>
      </div>
      <ErrorBox message={error} />
      {!items ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thao tác</th>
                <th>Hành động</th>
                <th>Đối tượng</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>{dateTime(x.createdAt)}</td>
                  <td>
                    {x.actor?.fullName ?? "Hệ thống"}
                    <br />
                    <span className="muted">{x.actor?.email}</span>
                  </td>
                  <td>{vi(x.action, "auditAction")}</td>
                  <td>{vi(x.entityType, "auditEntity")}</td>
                  <td>{x.entityId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
