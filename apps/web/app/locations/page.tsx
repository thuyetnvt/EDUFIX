"use client";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { ErrorBox, Loading } from "../../components/UI";
import { api } from "../../lib/api";
export default function Locations() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    api<any[]>("/locations")
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(f);
    if (!body.parentId) delete body.parentId;
    try {
      await api("/locations", { method: "POST", body: JSON.stringify(body) });
      e.currentTarget.reset();
      load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Không thể tạo vị trí");
    }
  }
  return (
    <AppShell title="Cấu trúc vị trí">
      <div className="split">
        <section>
          <div className="page-head">
            <div>
              <h2>Khu vực trong trường</h2>
              <p>Cơ sở → tòa nhà → tầng → phòng.</p>
            </div>
          </div>
          <ErrorBox message={error} />
          {!items ? (
            <Loading />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Loại</th>
                    <th>Thuộc</th>
                    <th>Thiết bị</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x) => (
                    <tr key={x.id}>
                      <td>{x.code}</td>
                      <td>{x.name}</td>
                      <td>{x.type}</td>
                      <td>{x.parent?.name ?? "—"}</td>
                      <td>{x._count?.assets ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="card">
          <div className="card-header">
            <h3>Thêm vị trí</h3>
          </div>
          <form onSubmit={submit}>
            <label>
              Tên
              <input name="name" required />
            </label>
            <label>
              Mã
              <input name="code" required />
            </label>
            <label>
              Loại
              <select name="type" required>
                <option value="CAMPUS">Cơ sở</option>
                <option value="BUILDING">Tòa nhà</option>
                <option value="FLOOR">Tầng</option>
                <option value="ROOM">Phòng</option>
              </select>
            </label>
            <label>
              Vị trí cha
              <select name="parentId">
                <option value="">Không có</option>
                {items?.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} · {x.type}
                  </option>
                ))}
              </select>
            </label>
            <button className="button section">Thêm vị trí</button>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}
