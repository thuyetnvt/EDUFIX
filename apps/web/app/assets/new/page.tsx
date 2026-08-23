"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { ErrorBox } from "../../../components/UI";
import { api } from "../../../lib/api";

export default function NewAsset() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([api<any[]>("/asset-categories"), api<any[]>("/locations")])
      .then(([c, l]) => {
        setCategories(c);
        setLocations(l.filter((x) => x.type === "ROOM"));
      })
      .catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const created = await api<any>("/assets", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      router.push(`/assets/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo thiết bị",
      );
      setBusy(false);
    }
  }
  return (
    <AppShell title="Thêm thiết bị">
      <div className="page-head">
        <div>
          <h2>Thông tin tài sản</h2>
          <p>Tạo mã tài sản và QR định danh duy nhất.</p>
        </div>
      </div>
      <form className="form" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="form-grid">
          <label>
            Mã tài sản
            <input name="assetCode" placeholder="VD: MAYCHIEU-031" required />
          </label>
          <label>
            Tên thiết bị
            <input name="name" required />
          </label>
          <label>
            Nhóm thiết bị
            <select name="categoryId" required>
              <option value="">Chọn nhóm</option>
              {categories.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phòng đặt thiết bị
            <select name="locationId" required>
              <option value="">Chọn phòng</option>
              {locations.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} ({x.code})
                </option>
              ))}
            </select>
          </label>
          <label>
            Hãng sản xuất
            <input name="manufacturer" />
          </label>
          <label>
            Model
            <input name="model" />
          </label>
          <label>
            Số serial
            <input name="serialNumber" />
          </label>
          <label>
            Ngày mua
            <input name="purchaseDate" type="date" />
          </label>
          <label>
            Ngày hết bảo hành
            <input name="warrantyUntil" type="date" />
          </label>
          <label className="full">
            Mô tả
            <textarea name="description" />
          </label>
        </div>
        <div className="form-actions">
          <button className="button" disabled={busy}>
            {busy ? "Đang lưu..." : "Lưu thiết bị"}
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() => router.back()}
          >
            Hủy
          </button>
        </div>
      </form>
    </AppShell>
  );
}
