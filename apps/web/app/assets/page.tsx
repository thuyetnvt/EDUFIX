"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, Empty, ErrorBox, Loading } from "../../components/UI";
import { api, dateTime } from "../../lib/api";

export default function Assets() {
  const [result, setResult] = useState<any>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setError("");
      api(
        `/assets?page=${page}&pageSize=15&q=${encodeURIComponent(q)}${status ? `&status=${status}` : ""}`,
      )
        .then(setResult)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, status, page]);
  return (
    <AppShell
      title="Quản lý thiết bị"
      actions={
        <Link className="button" href="/assets/new">
          + Thêm thiết bị
        </Link>
      }
    >
      <div className="page-head">
        <div>
          <h2>Danh mục tài sản</h2>
          <p>Theo dõi trạng thái, vị trí và lịch sử của từng thiết bị.</p>
        </div>
        <Link className="button" href="/assets/new">
          + Thêm thiết bị
        </Link>
      </div>
      <div className="filters">
        <input
          placeholder="Tìm mã hoặc tên thiết bị..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="FAULTY">Đang hỏng</option>
          <option value="REPAIRING">Đang sửa</option>
          <option value="RETIRED">Ngừng sử dụng</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {!result ? (
        <Loading />
      ) : result.items.length === 0 ? (
        <Empty text="Không tìm thấy thiết bị phù hợp." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã tài sản</th>
                  <th>Tên thiết bị</th>
                  <th>Nhóm</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Số sự cố</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/assets/${item.id}`}>{item.assetCode}</Link>
                    </td>
                    <td>
                      {item.name}
                      <br />
                      <span className="muted">
                        {item.manufacturer} {item.model}
                      </span>
                    </td>
                    <td>{item.category?.name}</td>
                    <td>{item.location?.name}</td>
                    <td>
                      <Badge value={item.status} />
                    </td>
                    <td>{item._count?.incidents ?? 0}</td>
                    <td>{dateTime(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              className="button secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Trước
            </button>
            <span>
              Trang {page} /{" "}
              {Math.max(1, Math.ceil(result.total / result.pageSize))}
            </span>
            <button
              className="button secondary"
              disabled={page * result.pageSize >= result.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau →
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
