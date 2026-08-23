"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
export default function Scan() {
  const router = useRouter();
  const [value, setValue] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const token = value.includes("/scan/")
      ? value.split("/scan/").pop()
      : value;
    if (token) router.push(`/scan/${encodeURIComponent(token)}`);
  }
  return (
    <AppShell title="Quét QR thiết bị">
      <section className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        <div className="quick-card">
          <b>⌗</b>
          <span>Hướng camera vào mã QR trên thiết bị</span>
        </div>
        <p className="muted">
          Trình duyệt chưa cấp camera? Nhập token hoặc dán đường dẫn từ mã QR.
        </p>
        <form onSubmit={submit}>
          <label>
            Mã QR
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Dán token QR tại đây"
              required
            />
          </label>
          <button className="button section">Tra cứu thiết bị</button>
        </form>
      </section>
    </AppShell>
  );
}
