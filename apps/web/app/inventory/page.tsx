"use client";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, ErrorBox, Loading, Stat } from "../../components/UI";
import { api, dateTime, money } from "../../lib/api";
export default function Inventory() {
  const [parts, setParts] = useState<any[] | null>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const load = () =>
    Promise.all([
      api<any[]>("/inventory/parts"),
      api<any[]>("/inventory/transactions"),
    ])
      .then(([p, t]) => {
        setParts(p);
        setTxs(t);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/inventory/transactions", {
        method: "POST",
        body: JSON.stringify({
          partId: f.get("partId"),
          type: f.get("type"),
          quantity: Number(f.get("quantity")),
          note: f.get("note"),
        }),
      });
      e.currentTarget.reset();
      load();
    } catch (c) {
      setError(c instanceof Error ? c.message : "Không thể cập nhật kho");
    }
  }
  async function createPart(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api("/inventory/parts", {
        method: "POST",
        body: JSON.stringify({
          partCode: form.get("partCode"),
          name: form.get("name"),
          category: form.get("category"),
          unit: form.get("unit"),
          minimumQuantity: Number(form.get("minimumQuantity")),
          unitPrice: Number(form.get("unitPrice")),
        }),
      });
      e.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo vật tư",
      );
    }
  }
  const low = parts?.filter((x) => x.quantity <= x.minimumQuantity).length ?? 0;
  return (
    <AppShell title="Kho vật tư">
      <ErrorBox message={error} />
      {!parts ? (
        <Loading />
      ) : (
        <>
          <section className="grid">
            <Stat label="Loại vật tư" value={parts.length} />
            <Stat
              label="Sắp hết hàng"
              value={low}
              tone={low ? "red" : "green"}
            />
            <Stat
              label="Tổng tồn"
              value={parts.reduce((s, x) => s + x.quantity, 0)}
            />
            <Stat
              label="Giá trị tồn"
              value={money(
                parts.reduce((s, x) => s + x.quantity * Number(x.unitPrice), 0),
              )}
              tone="green"
            />
          </section>
          <section className="card section">
            <div className="card-header">
              <h2>Thêm loại vật tư</h2>
            </div>
            <form className="form-grid" onSubmit={createPart}>
              <label>
                Mã vật tư
                <input name="partCode" required />
              </label>
              <label>
                Tên vật tư
                <input name="name" required />
              </label>
              <label>
                Nhóm
                <input
                  name="category"
                  placeholder="Điện, mạng, máy tính..."
                  required
                />
              </label>
              <label>
                Đơn vị
                <input name="unit" placeholder="cái, mét, hộp..." required />
              </label>
              <label>
                Tồn tối thiểu
                <input
                  name="minimumQuantity"
                  type="number"
                  min="0"
                  defaultValue="2"
                  required
                />
              </label>
              <label>
                Đơn giá
                <input
                  name="unitPrice"
                  type="number"
                  min="0"
                  defaultValue="0"
                  required
                />
              </label>
              <div className="full">
                <button className="button">Thêm vật tư</button>
              </div>
            </form>
          </section>
          <div className="split section">
            <section className="card">
              <div className="card-header">
                <h2>Danh mục vật tư</h2>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Nhóm</th>
                      <th>Tồn</th>
                      <th>Tối thiểu</th>
                      <th>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((x) => (
                      <tr key={x.id}>
                        <td>{x.partCode}</td>
                        <td>{x.name}</td>
                        <td>{x.category}</td>
                        <td>
                          <Badge
                            value={
                              x.quantity <= x.minimumQuantity
                                ? "OVERDUE"
                                : "IN_STOCK"
                            }
                          />{" "}
                          {x.quantity} {x.unit}
                        </td>
                        <td>{x.minimumQuantity}</td>
                        <td>{money(Number(x.unitPrice))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <aside className="card">
              <div className="card-header">
                <h3>Nhập / xuất kho</h3>
              </div>
              <form onSubmit={submit}>
                <label>
                  Vật tư
                  <select name="partId" required>
                    <option value="">Chọn vật tư</option>
                    {parts.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.partCode} · {x.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Giao dịch
                  <select name="type">
                    <option value="STOCK_IN">Nhập kho</option>
                    <option value="STOCK_OUT">Xuất kho</option>
                    <option value="ADJUSTMENT">Điều chỉnh</option>
                  </select>
                </label>
                <label>
                  Số lượng
                  <input name="quantity" type="number" min="0" required />
                </label>
                <label>
                  Ghi chú
                  <input name="note" />
                </label>
                <button className="button section">Ghi nhận</button>
              </form>
            </aside>
          </div>
          <section className="card section">
            <div className="card-header">
              <h2>Giao dịch gần đây</h2>
            </div>
            {txs.slice(0, 10).map((x) => (
              <div className="comment" key={x.id}>
                <b>
                  {x.type} · {x.part?.name} · {x.quantity}
                </b>
                <p>
                  {x.note} · {dateTime(x.createdAt)} · {x.actor?.fullName}
                </p>
              </div>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
