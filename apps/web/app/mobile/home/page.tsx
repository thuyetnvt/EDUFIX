"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { Badge, Loading } from "../../../components/UI";
import { api, dateTime } from "../../../lib/api";
export default function MobileHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api<any>("/incidents?pageSize=5").then(setData);
  }, []);
  return (
    <AppShell title="Xin chào">
      <div className="mobile-quick">
        <Link className="quick-card" href="/mobile/scan">
          <b>⌗</b>
          <span>Quét mã QR</span>
        </Link>
        <Link className="quick-card" href="/incidents/new">
          <b>＋</b>
          <span>Báo sự cố</span>
        </Link>
      </div>
      <section className="section">
        <div className="page-head">
          <div>
            <h2>Phiếu gần đây của tôi</h2>
            <p>Theo dõi tiến độ xử lý thiết bị đã báo.</p>
          </div>
        </div>
        {!data ? (
          <Loading />
        ) : (
          <div className="card">
            {data.items.map((x: any) => (
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
                  <b>{x.incidentCode}</b>
                  <Badge value={x.status} />
                </header>
                <p>
                  {x.title} · {x.asset?.name}
                </p>
                <small>{dateTime(x.createdAt)}</small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
