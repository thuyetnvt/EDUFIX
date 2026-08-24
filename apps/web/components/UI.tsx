"use client";

import { AlertCircle, CheckCircle2, Circle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { LabelKind, vi } from "../lib/i18n";

export function Badge({ value, kind }: { value?: string; kind?: LabelKind }) {
  return <span className={`badge badge-${(value ?? "default").toLowerCase()}`}>{vi(value, kind)}</span>;
}

export function Empty({ text = "Chưa có dữ liệu", action }: { text?: string; action?: React.ReactNode }) {
  return <div className="empty"><Inbox size={30} aria-hidden="true" /><b>Không có kết quả</b><span>{text}</span>{action}</div>;
}

export function ErrorBox({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  if (!message) return null;
  return <div className="error" role="alert"><AlertCircle size={18} /><span>{message}</span>{onRetry && <button className="button secondary" onClick={onRetry}><RefreshCw size={15} /> Thử lại</button>}</div>;
}

export function Loading({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return <div className="loading" role="status"><Loader2 size={18} className="spin" /> {label}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Toast({ message, tone = "success" }: { message?: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return <div className={`toast toast-${tone}`} role="status">{tone === "success" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}{message}</div>;
}

export function Stat({ label, value, note, tone = "blue" }: { label: string; value: React.ReactNode; note?: string; tone?: string }) {
  return <article className={`stat stat-${tone}`}><div className="stat-icon" aria-hidden="true"><Circle size={10} fill="currentColor" /></div><div><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div></article>;
}
