"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../../components/AppShell";
import { Badge, ErrorBox, Loading } from "../../../../components/UI";
import { API_URL, api, dateTime } from "../../../../lib/api";
import { vi } from "../../../../lib/i18n";

export default function MaintenanceTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("BEFORE_REPAIR");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<any>(`/maintenance/tasks/${id}`).then((value) => setTask(value)).catch((e: Error) => setError(e.message)), [id]);
  useEffect(() => { void load(); }, [load]);

  async function start() {
    setBusy(true); setError("");
    try { await api(`/maintenance/tasks/${id}/start`, { method: "POST" }); setMessage("Đã bắt đầu công việc."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể bắt đầu công việc"); }
    finally { setBusy(false); }
  }
  async function complete() {
    setBusy(true); setError("");
    try { await api(`/maintenance/tasks/${id}/complete`, { method: "POST", body: JSON.stringify({ checklistResult: (task.plan?.checklist ?? []).map((item: string) => ({ item, completed: Boolean(checked[item]), ...(notes[item] ? { note: notes[item] } : {}) })), note }) }); setMessage("Đã hoàn tất công việc."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể hoàn tất công việc"); }
    finally { setBusy(false); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await api(`/maintenance/tasks/${id}/attachments`, { method: "POST", body: form }); setMessage("Đã tải ảnh lên."); event.currentTarget.reset(); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể tải ảnh"); }
    finally { setBusy(false); }
  }
  if (!task) return <AppShell title="Chi tiết bảo trì"><ErrorBox message={error} /><Loading /></AppShell>;
  const checklist = (task.plan?.checklist ?? []) as string[];
  const canComplete = checklist.every((item) => checked[item] || notes[item]?.trim());
  return <AppShell title="Chi tiết công việc bảo trì"><div className="page-head"><div><Link className="muted" href="/maintenance">← Quay lại danh sách</Link><h2>{task.plan?.name}</h2><p>{task.asset?.assetCode} · {task.asset?.name} · {task.asset?.location?.name}</p></div><Badge value={task.status} kind="maintenanceStatus" /></div><ErrorBox message={error} /><div className="detail-grid"><div><section className="card"><div className="card-header"><h3>Checklist bảo trì</h3><span className="muted">Hạn {dateTime(task.dueAt)}</span></div>{checklist.length === 0 ? <p className="muted">Kế hoạch chưa có checklist.</p> : <div className="task-checklist detail-checklist">{checklist.map((item) => <div className="checklist-item" key={item}><label><input type="checkbox" checked={Boolean(checked[item])} disabled={task.status !== "IN_PROGRESS"} onChange={(event) => setChecked((value) => ({ ...value, [item]: event.target.checked }))} />{item}</label>{!checked[item] && task.status === "IN_PROGRESS" && <input value={notes[item] ?? ""} onChange={(event) => setNotes((value) => ({ ...value, [item]: event.target.value }))} placeholder="Lý do bỏ qua mục này" />}</div>)}</div>}<label className="section">Ghi chú chung<textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={task.status !== "IN_PROGRESS"} placeholder="Mô tả kết quả, phát hiện bất thường..." /></label>{task.status === "PENDING" && <button className="button" disabled={busy} onClick={() => void start()}>Bắt đầu công việc</button>}{task.status === "IN_PROGRESS" && <button className="button" disabled={busy || !canComplete} onClick={() => void complete()}>{busy ? "Đang lưu…" : "Hoàn tất công việc"}</button>}</section><section className="card section"><div className="card-header"><h3>Ảnh trước / sau bảo trì</h3></div><form className="form-grid" onSubmit={upload}><label>Loại ảnh<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}><option value="BEFORE_REPAIR">Ảnh trước bảo trì</option><option value="AFTER_REPAIR">Ảnh sau bảo trì</option><option value="MAINTENANCE">Ảnh bảo trì</option></select></label><label>Chọn ảnh<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><div className="full"><button className="button secondary" disabled={busy}>Tải ảnh lên</button></div></form><div className="attachment-grid">{(task.attachments ?? []).map((attachment: any) => <a key={attachment.id} href={`${new URL(API_URL).origin}${attachment.fileUrl}`} target="_blank" rel="noreferrer"><img src={`${new URL(API_URL).origin}${attachment.fileUrl}`} alt={attachment.fileName} /><span>{attachment.fileName}</span></a>)}</div></section></div><aside><section className="card"><div className="card-header"><h3>Thông tin kế hoạch</h3></div><div className="definition"><div><span>Chu kỳ</span><strong>{task.plan?.interval} · {vi(task.plan?.recurrenceType, "recurrence")}</strong></div><div><span>Kỹ thuật viên</span><strong>{task.technician?.fullName ?? "Chưa giao"}</strong></div><div><span>Trạng thái</span><strong><Badge value={task.status} kind="maintenanceStatus" /></strong></div><div><span>Hoàn thành lúc</span><strong>{dateTime(task.completedAt)}</strong></div></div></section>{message && <div className="success section">{message}</div>}</aside></div></AppShell>;
}
