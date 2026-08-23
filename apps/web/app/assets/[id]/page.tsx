"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../../components/AppShell";
import { Badge, ErrorBox, Loading } from "../../../components/UI";
import { api, dateTime, getCurrentUser, money } from "../../../lib/api";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [qr, setQr] = useState<any>(null);
  const [error, setError] = useState("");
  const [manager, setManager] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const load = () =>
    Promise.all([
      api<any>(`/assets/${id}`),
      api<any>(`/assets/${id}/history`),
      api<any>(`/assets/${id}/qr`),
    ])
      .then(([a, h, qrResult]) => {
        setItem(a);
        setHistory(h);
        setQr(qrResult);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
    getCurrentUser().then((user) => {
      if (["ADMIN", "FACILITY_MANAGER"].includes(user.role)) {
        setManager(true);
        api<any[]>("/locations").then((rows) =>
          setLocations(rows.filter((row) => row.type === "ROOM")),
        );
      }
    });
  }, [id]);
  async function transfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/assets/${id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          toLocationId: form.get("toLocationId"),
          reason: form.get("reason"),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể điều chuyển",
      );
    }
  }
  async function regenerateQr() {
    try {
      const result = await api<any>(`/assets/${id}/qr/regenerate`, {
        method: "POST",
      });
      setQr(result);
      setItem((current: any) => ({ ...current, qrToken: result.qrToken }));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo lại QR",
      );
    }
  }
  return (
    <AppShell
      title={item?.name ?? "Chi tiết thiết bị"}
      actions={
        <Link className="button" href={`/incidents/new?assetId=${id}`}>
          + Báo sự cố
        </Link>
      }
    >
      <ErrorBox message={error} />
      {!item ? (
        <Loading />
      ) : (
        <>
          <div className="detail-grid">
            <section className="card">
              <div className="card-header">
                <h2>{item.assetCode}</h2>
                <Badge value={item.status} />
              </div>
              <div className="definition">
                <div>
                  <span>Nhóm</span>
                  <strong>{item.category?.name}</strong>
                </div>
                <div>
                  <span>Vị trí</span>
                  <strong>{item.location?.name}</strong>
                </div>
                <div>
                  <span>Hãng / model</span>
                  <strong>
                    {item.manufacturer ?? "—"} {item.model}
                  </strong>
                </div>
                <div>
                  <span>Serial</span>
                  <strong>{item.serialNumber ?? "—"}</strong>
                </div>
                <div>
                  <span>Ngày mua</span>
                  <strong>{dateTime(item.purchaseDate)}</strong>
                </div>
                <div>
                  <span>Bảo hành đến</span>
                  <strong>{dateTime(item.warrantyUntil)}</strong>
                </div>
                <div>
                  <span>Giá mua</span>
                  <strong>{money(Number(item.purchasePrice ?? 0))}</strong>
                </div>
                <div>
                  <span>QR Token</span>
                  <strong style={{ wordBreak: "break-all" }}>
                    {item.qrToken}
                  </strong>
                </div>
              </div>
              {item.description && <p>{item.description}</p>}
              {qr && (
                <div
                  className="section"
                  style={{
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <img
                    src={qr.qrDataUrl}
                    alt={`QR ${item.assetCode}`}
                    width="180"
                    height="180"
                  />
                  <div>
                    <b>QR báo sự cố</b>
                    <p className="muted">{qr.url}</p>
                    {manager && (
                      <button
                        className="button secondary"
                        onClick={regenerateQr}
                      >
                        Tạo lại QR
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
            <aside className="card">
              <div className="card-header">
                <h3>Lịch sử di chuyển</h3>
              </div>
              <div className="timeline">
                {item.transfers?.length ? (
                  item.transfers.map((t: any) => (
                    <div className="timeline-item" key={t.id}>
                      <b>
                        {t.fromLocation?.name ?? "Kho"} → {t.toLocation?.name}
                      </b>
                      <span>{t.reason}</span>
                      <small>
                        {dateTime(t.transferredAt)} ·{" "}
                        {t.transferredBy?.fullName}
                      </small>
                    </div>
                  ))
                ) : (
                  <span className="muted">Chưa có lần di chuyển.</span>
                )}
              </div>
              {manager && (
                <form className="section" onSubmit={transfer}>
                  <h4>Điều chuyển thiết bị</h4>
                  <label>
                    Phòng mới
                    <select name="toLocationId" required>
                      <option value="">Chọn phòng</option>
                      {locations
                        .filter((location) => location.id !== item.locationId)
                        .map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} · {location.code}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Lý do
                    <textarea name="reason" minLength={3} required />
                  </label>
                  <button className="button">Xác nhận điều chuyển</button>
                </form>
              )}
            </aside>
          </div>
          <section className="card section">
            <div className="card-header">
              <h2>Lịch sử sự cố</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã phiếu</th>
                    <th>Nội dung</th>
                    <th>Ưu tiên</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {history?.incidents?.map((x: any) => (
                    <tr key={x.id}>
                      <td>
                        <Link href={`/incidents/${x.id}`}>
                          {x.incidentCode}
                        </Link>
                      </td>
                      <td>{x.title}</td>
                      <td>
                        <Badge value={x.priority} />
                      </td>
                      <td>
                        <Badge value={x.status} />
                      </td>
                      <td>{dateTime(x.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
