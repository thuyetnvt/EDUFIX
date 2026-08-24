"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, UploadCloud, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import AppShell from "../../../components/AppShell";
import { Badge, Empty, ErrorBox } from "../../../components/UI";
import { api } from "../../../lib/api";
import { vi } from "../../../lib/i18n";

const schema = z.object({
  assetId: z.string().min(1, "Vui lòng chọn thiết bị"),
  title: z.string().min(4, "Tiêu đề cần ít nhất 4 ký tự"),
  description: z.string().min(8, "Mô tả cần ít nhất 8 ký tự"),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewIncident() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { assetId: "", priority: undefined } });

  useEffect(() => {
    setValue("assetId", new URLSearchParams(window.location.search).get("assetId") ?? "");
    api<any>("/assets?pageSize=100").then((result) => setAssets(result.items)).catch((e: Error) => setError(e.message));
  }, [setValue]);

  async function loadPreview() {
    const values = getValues();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setError("Nhập đủ thiết bị, tiêu đề và mô tả trước khi xem gợi ý.");
      return;
    }
    setError("");
    setPreviewBusy(true);
    try { setPreview(await api("/incidents/preview", { method: "POST", body: JSON.stringify(parsed.data) })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lấy gợi ý"); }
    finally { setPreviewBusy(false); }
  }

  async function submit(values: FormValues) {
    setBusy(true); setError("");
    try {
      const created = await api<any>("/incidents", { method: "POST", body: JSON.stringify({ ...values, priority: values.priority || undefined }) });
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "INCIDENT");
        await api(`/incidents/${created.id}/attachments`, { method: "POST", body: form });
      }
      router.push(`/incidents/${created.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo phiếu");
      setBusy(false);
    }
  }

  return <AppShell title="Báo sự cố"><div className="page-head"><div><h2>Mô tả vấn đề</h2><p>EduFix gợi ý nhóm lỗi và mức ưu tiên để xử lý nhanh hơn.</p></div></div><form className="form" onSubmit={handleSubmit(submit)}><ErrorBox message={error} /><div className="form-grid">
    <label className="full">Thiết bị<select {...register("assetId")}><option value="">Chọn thiết bị</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.assetCode} · {asset.name} · {asset.location?.name}</option>)}</select>{errors.assetId && <small className="field-error">{errors.assetId.message}</small>}</label>
    <label className="full">Tiêu đề<input {...register("title")} placeholder="Ví dụ: Máy chiếu không lên nguồn" />{errors.title && <small className="field-error">{errors.title.message}</small>}</label>
    <label className="full">Mô tả chi tiết<textarea {...register("description")} placeholder="Mô tả biểu hiện, thời điểm xảy ra và mức độ ảnh hưởng..." />{errors.description && <small className="field-error">{errors.description.message}</small>}</label>
    <label>Mức ưu tiên<select {...register("priority")}><option value="">Để AI gợi ý</option>{["URGENT", "HIGH", "MEDIUM", "LOW"].map((value) => <option key={value} value={value}>{vi(value, "priority")}</option>)}</select></label>
    <div className="form-field"><span>Ảnh hiện trường</span><label className="upload-drop"><UploadCloud size={22} /><span>Kéo thả hoặc chọn ảnh</span><small>JPEG, PNG, WebP · tối đa 5MB/ảnh</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>{files.length > 0 && <div className="file-list">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<button type="button" aria-label={`Xóa ${file.name}`} onClick={() => setFiles((items) => items.filter((item) => item !== file))}><X size={13} /></button></span>)}</div>}</div>
  </div><div className="ai-preview card"><div className="card-header"><div><h3><Sparkles size={17} /> Gợi ý trợ lý AI</h3><span className="muted">Kiểm tra trước khi gửi, bạn vẫn có thể điều chỉnh ưu tiên.</span></div><button type="button" className="button secondary" onClick={() => void loadPreview()} disabled={previewBusy}>{previewBusy ? "Đang phân tích…" : "Phân tích nội dung"}</button></div>{preview ? <div className="ai-result"><div><span className="muted">Nhóm lỗi</span><b>{vi(preview.suggestion.category, "aiCategory")} · {vi(preview.suggestion.issueType, "aiIssueType")}</b></div><div><span className="muted">Mức gợi ý</span><button type="button" className="link-button" onClick={() => setValue("priority", preview.suggestion.suggestedPriority)}><Badge value={preview.suggestion.suggestedPriority} kind="priority" /> Áp dụng</button></div><div><span className="muted">Nguyên nhân có thể</span><b>{preview.suggestion.possibleCauses.join(" · ")}</b></div>{preview.possibleDuplicates?.length > 0 && <div className="duplicate-warning"><b>Có {preview.possibleDuplicates.length} phiếu đang hoạt động có thể trùng</b>{preview.possibleDuplicates.map((item: any) => <a key={item.id} href={`/incidents/${item.id}`}>{item.incidentCode} · {item.title} ({Math.round(item.score * 100)}%)</a>)}</div>}</div> : <Empty text="Nhập nội dung rồi bấm phân tích để xem gợi ý." />}</div><div className="form-actions"><button className="button" disabled={busy}>{busy ? "Đang gửi…" : "Gửi phiếu sự cố"}</button><button type="button" className="button secondary" onClick={() => router.back()}>Hủy</button></div></form></AppShell>;
}
