"use client";
import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { vi } from "../../../lib/i18n";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function ScanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: qrToken } = use(params);
  const [asset, setAsset] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("Đang tra cứu thiết bị...");
  const [submitted, setSubmitted] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/scan/${encodeURIComponent(qrToken)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message ?? "Không tìm thấy thiết bị");
        setAsset(data);
        setTitle(`Báo hỏng ${data.name}`);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }, [qrToken]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const token = localStorage.getItem("edufix_token");
    if (!token) {
      window.location.href = `/login?redirect=/scan/${qrToken}`;
      return;
    }
    const response = await fetch(`${API}/incidents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assetId: asset.id, title, description }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message ?? "Không thể tạo phiếu");
      return;
    }
    setSubmitted(data);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        display: "grid",
        placeItems: "center",
        background: "#f5f7fb",
      }}
    >
      <section className="form" style={{ width: "min(560px, 100%)" }}>
        <Link href="/" className="muted">
          ← EduFix
        </Link>
        <h1 style={{ color: "var(--blue)" }}>Báo sự cố thiết bị</h1>
        {message && <div className="error">{message}</div>}
        {asset && !submitted && (
          <>
            <div className="card" style={{ padding: 14 }}>
              <strong>{asset.name}</strong>
              <div className="muted">
                {asset.assetCode} · {asset.location?.name ?? asset.location}
              </div>
            </div>
            <form onSubmit={submit}>
              <label>Tiêu đề</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <label>Mô tả sự cố</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Mô tả hiện tượng, thời điểm và mức độ ảnh hưởng"
                required
              />
              <button className="button" style={{ marginTop: 16 }}>
                Gửi phiếu sự cố
              </button>
            </form>
          </>
        )}
        {submitted && (
          <div className="card" style={{ marginTop: 16 }}>
            <h2>Đã tiếp nhận {submitted.incidentCode}</h2>
            <p>
              {submitted.aiSuggestion?.summary ??
                "Phiếu đã được tạo và chờ xử lý."}
            </p>
            <p className="muted">
              Mức ưu tiên đề xuất: {vi(submitted.priority, "priority")}
            </p>
            <Link href="/" className="button">
              Về dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
