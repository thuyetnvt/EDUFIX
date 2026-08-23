"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { ErrorBox } from "../../../components/UI";
import { api } from "../../../lib/api";

export default function NewIncident() {
  const router = useRouter();
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAssetId(
      new URLSearchParams(window.location.search).get("assetId") ?? "",
    );
    api<any>("/assets?pageSize=100")
      .then((x) => setAssets(x.items))
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f);
    if (!body.priority) delete body.priority;
    try {
      const created = await api<any>("/incidents", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/incidents/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo phiếu",
      );
      setBusy(false);
    }
  }
  return (
    <AppShell title="Báo sự cố">
      <div className="page-head">
        <div>
          <h2>Mô tả vấn đề</h2>
          <p>EduFix sẽ tự động gợi ý mức ưu tiên và nhóm lỗi.</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="form-grid">
          <label className="full">
            Thiết bị
            <select
              name="assetId"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              required
            >
              <option value="">Chọn thiết bị</option>
              {assets.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.assetCode} · {x.name} · {x.location?.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Tiêu đề
            <input
              name="title"
              minLength={4}
              placeholder="VD: Máy chiếu không lên nguồn"
              required
            />
          </label>
          <label className="full">
            Mô tả chi tiết
            <textarea
              name="description"
              minLength={8}
              placeholder="Mô tả biểu hiện, thời điểm xảy ra và mức độ ảnh hưởng..."
              required
            />
          </label>
          <label>
            Mức ưu tiên (tùy chọn)
            <select name="priority">
              <option value="">Để AI gợi ý</option>
              <option value="URGENT">Khẩn cấp</option>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Thấp</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="button" disabled={busy}>
            {busy ? "Đang tạo phiếu..." : "Gửi phiếu sự cố"}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => router.back()}
          >
            Hủy
          </button>
        </div>
      </form>
    </AppShell>
  );
}
