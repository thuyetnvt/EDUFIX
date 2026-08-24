"use client";

import Link from "next/link";
import { ClipboardPlus, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { Badge, Empty, ErrorBox, Loading } from "../../../components/UI";
import { api, dateTime } from "../../../lib/api";

export default function MobileHome() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const load = () => api<any>("/incidents?pageSize=5").then(setData).catch((e: Error) => setError(e.message));
  useEffect(() => { void load(); }, []);
  return <AppShell title="Xin chào"><div className="mobile-quick"><Link className="quick-card" href="/mobile/scan"><QrCode size={30} /><span>Quét mã QR</span></Link><Link className="quick-card" href="/incidents/new"><ClipboardPlus size={30} /><span>Báo sự cố</span></Link></div><section className="section"><div className="page-head"><div><h2>Phiếu gần đây của tôi</h2><p>Theo dõi tiến độ xử lý thiết bị đã báo.</p></div></div><ErrorBox message={error} onRetry={() => void load()} />{!data ? <Loading /> : data.items.length === 0 ? <div className="card"><Empty text="Bạn chưa có phiếu sự cố nào." action={<Link className="button" href="/incidents/new">Báo sự cố</Link>} /></div> : <div className="card">{data.items.map((item: any) => <Link href={`/incidents/${item.id}`} className="comment dashboard-link" key={item.id}><header><b>{item.incidentCode}</b><Badge value={item.status} kind="incidentStatus" /></header><p>{item.title} · {item.asset?.name}</p><small>{dateTime(item.createdAt)}</small></Link>)}</div>}</section></AppShell>;
}
