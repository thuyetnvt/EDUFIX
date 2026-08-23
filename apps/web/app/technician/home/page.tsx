"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { Badge, Loading, Stat } from "../../../components/UI";
import { api, dateTime } from "../../../lib/api";
export default function TechnicianHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api<any>("/incidents?pageSize=50").then(setData);
  }, []);
  if (!data)
    return (
      <AppShell title="Công việc của tôi">
        <Loading />
      </AppShell>
    );
  const active = data.items.filter(
    (x: any) => !["COMPLETED", "CANCELLED"].includes(x.status),
  );
  return (
    <AppShell title="Công việc của tôi">
      <section className="grid">
        <Stat label="Đang được giao" value={active.length} />
        <Stat
          label="Đang sửa"
          value={active.filter((x: any) => x.status === "IN_PROGRESS").length}
          tone="amber"
        />
        <Stat
          label="Chờ vật tư"
          value={
            active.filter((x: any) => x.status === "WAITING_FOR_PARTS").length
          }
        />
        <Stat
          label="Quá hạn"
          value={
            active.filter((x: any) => x.dueAt && new Date(x.dueAt) < new Date())
              .length
          }
          tone="red"
        />
      </section>
      <section className="card section">
        <div className="card-header">
          <h2>Ưu tiên xử lý</h2>
        </div>
        {active.map((x: any) => (
          <Link
            href={`/incidents/${x.id}`}
            className="comment"
            style={{
              display: "block",
              color: "inherit",
              textDecoration: "none",
            }}
            key={x.id}
          >
            <header>
              <b>
                {x.incidentCode} · {x.title}
              </b>
              <Badge value={x.priority} />
            </header>
            <p>
              {x.asset?.name} · {x.asset?.location?.name}
            </p>
            <small>
              Hạn {dateTime(x.dueAt)} · <Badge value={x.status} />
            </small>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
