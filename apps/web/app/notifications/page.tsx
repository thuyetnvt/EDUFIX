"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "../../components/AppShell";
import { Empty, ErrorBox, Loading } from "../../components/UI";
import { api, dateTime } from "../../lib/api";
export default function Notifications() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    api<any[]>("/notifications")
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function readAll() {
    await api("/notifications/read-all", { method: "POST" });
    load();
  }
  return (
    <AppShell
      title="Thông báo"
      actions={
        <button className="button secondary" onClick={readAll}>
          Đánh dấu đã đọc
        </button>
      }
    >
      <ErrorBox message={error} />
      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text="Bạn chưa có thông báo nào." />
      ) : (
        <section className="card">
          {items.map((x) => (
            <div
              className="comment"
              key={x.id}
              style={{ opacity: x.readAt ? 0.65 : 1 }}
            >
              <header>
                <b>{x.title}</b>
                <span>{dateTime(x.createdAt)}</span>
              </header>
              <p>{x.message}</p>
              {x.entityType === "Incident" && (
                <Link href={`/incidents/${x.entityId}`}>Mở phiếu →</Link>
              )}
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}
