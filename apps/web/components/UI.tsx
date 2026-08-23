"use client";

import { vi } from "../lib/api";

export function Badge({ value }: { value?: string }) {
  return (
    <span className={`badge badge-${(value ?? "default").toLowerCase()}`}>
      {vi(value)}
    </span>
  );
}
export function Empty({ text = "Chưa có dữ liệu" }: { text?: string }) {
  return (
    <div className="empty">
      <b>Không có kết quả</b>
      <span>{text}</span>
    </div>
  );
}
export function ErrorBox({ message }: { message?: string }) {
  return message ? <div className="error">{message}</div> : null;
}
export function Loading() {
  return (
    <div className="loading">
      <span /> Đang tải dữ liệu...
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  tone?: string;
}) {
  return (
    <article className={`stat stat-${tone}`}>
      <div className="stat-icon">●</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {note && <small>{note}</small>}
      </div>
    </article>
  );
}
