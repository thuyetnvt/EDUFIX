"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { Badge, ErrorBox, Loading } from "../../../components/UI";
import {
  API_URL,
  api,
  CurrentUser,
  dateTime,
  getCurrentUser,
  money,
} from "../../../lib/api";

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [techs, setTechs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(
    () =>
      api<any>(`/incidents/${id}`)
        .then(setItem)
        .catch((e) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    load();
    getCurrentUser().then((u) => {
      setUser(u);
      if (["ADMIN", "FACILITY_MANAGER"].includes(u.role))
        api<any[]>("/users?role=TECHNICIAN").then(setTechs);
    });
  }, [load]);
  async function post(path: string, body: any) {
    setError("");
    setMessage("");
    try {
      await api(`/incidents/${id}${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage("Đã cập nhật phiếu thành công.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật");
    }
  }
  async function comment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await post("/comments", {
      content: f.get("content"),
      internalOnly: f.get("internalOnly") === "on",
    });
    e.currentTarget.reset();
  }
  async function repair(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await post("/repair-result", {
      rootCause: f.get("rootCause"),
      resolution: f.get("resolution"),
      laborCost: Number(f.get("laborCost") || 0),
      externalCost: Number(f.get("externalCost") || 0),
    });
  }
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await api(`/incidents/${id}/attachments`, { method: "POST", body: form });
      setMessage("Đã tải ảnh lên phiếu.");
      e.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải ảnh");
    }
  }
  if (!item)
    return (
      <AppShell title="Chi tiết sự cố">
        <ErrorBox message={error} />
        <Loading />
      </AppShell>
    );
  const manager = user && ["ADMIN", "FACILITY_MANAGER"].includes(user.role);
  const reporter = user?.role === "REPORTER";
  const technician = user?.role === "TECHNICIAN";
  return (
    <AppShell title={item.incidentCode}>
      <ErrorBox message={error} />
      {message && <div className="success">{message}</div>}
      <div className="detail-grid">
        <div>
          <section className="card">
            <div className="card-header">
              <div>
                <Badge value={item.priority} /> <Badge value={item.status} />
              </div>
              <span className="muted">{dateTime(item.createdAt)}</span>
            </div>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <div className="definition section">
              <div>
                <span>Thiết bị</span>
                <strong>
                  {item.asset?.assetCode} · {item.asset?.name}
                </strong>
              </div>
              <div>
                <span>Vị trí</span>
                <strong>{item.asset?.location?.name}</strong>
              </div>
              <div>
                <span>Người báo</span>
                <strong>{item.reporter?.fullName}</strong>
              </div>
              <div>
                <span>Kỹ thuật viên</span>
                <strong>
                  {item.assignedTechnician?.fullName ?? "Chưa phân công"}
                </strong>
              </div>
              <div>
                <span>Hạn xử lý</span>
                <strong>{dateTime(item.dueAt)}</strong>
              </div>
              <div>
                <span>Tổng chi phí</span>
                <strong>
                  {money(
                    Number(item.laborCost ?? 0) +
                      Number(item.externalCost ?? 0),
                  )}
                </strong>
              </div>
            </div>
            {item.aiSuggestion && (
              <div className="demo-accounts">
                <b>Gợi ý từ trợ lý:</b> {item.aiSuggestion.category} ·{" "}
                {item.aiSuggestion.summary}
              </div>
            )}
          </section>
          {(item.rootCause || item.resolution) && (
            <section className="card section">
              <div className="card-header">
                <h3>Kết quả sửa chữa</h3>
              </div>
              <p>
                <b>Nguyên nhân:</b> {item.rootCause}
              </p>
              <p>
                <b>Giải pháp:</b> {item.resolution}
              </p>
            </section>
          )}
          <section className="card section">
            <div className="card-header">
              <h3>Hình ảnh ({item.attachments?.length ?? 0})</h3>
            </div>
            <div className="actions-row">
              {item.attachments?.map((attachment: any) => (
                <a
                  key={attachment.id}
                  href={`${new URL(API_URL).origin}${attachment.fileUrl}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {attachment.fileName}
                </a>
              ))}
            </div>
            <form className="form-grid section" onSubmit={upload}>
              <label className="full">
                Thêm ảnh JPEG, PNG hoặc WebP (tối đa 5 MB)
                <input
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </label>
              <input name="kind" type="hidden" value="INCIDENT" />
              <div className="full">
                <button className="button secondary">Tải ảnh lên</button>
              </div>
            </form>
          </section>
          <section className="card section">
            <div className="card-header">
              <h3>Trao đổi ({item.comments?.length ?? 0})</h3>
            </div>
            {item.comments?.map((x: any) => (
              <div
                className={`comment ${x.internalOnly ? "internal" : ""}`}
                key={x.id}
              >
                <header>
                  <b>
                    {x.author?.fullName} · {x.author?.role}
                  </b>
                  <span>{dateTime(x.createdAt)}</span>
                </header>
                <p>{x.content}</p>
                {x.internalOnly && <small>Ghi chú nội bộ</small>}
              </div>
            ))}
            <form onSubmit={comment} className="form-grid">
              <label className="full">
                Thêm bình luận
                <textarea name="content" required />
              </label>
              {!reporter && (
                <label>
                  <span>
                    <input name="internalOnly" type="checkbox" /> Chỉ nội bộ
                  </span>
                </label>
              )}
              <div className="full">
                <button className="button">Gửi bình luận</button>
              </div>
            </form>
          </section>
        </div>
        <aside>
          <section className="card">
            <div className="card-header">
              <h3>Thao tác</h3>
            </div>
            <div className="actions-row">
              {technician && item.status === "ASSIGNED" && (
                <button
                  className="button"
                  onClick={() =>
                    post("/transition", {
                      status: "IN_PROGRESS",
                      note: "Bắt đầu xử lý",
                    })
                  }
                >
                  Bắt đầu xử lý
                </button>
              )}
              {technician && item.status === "IN_PROGRESS" && (
                <button
                  className="button secondary"
                  onClick={() =>
                    post("/transition", {
                      status: "WAITING_FOR_PARTS",
                      note: "Chờ vật tư",
                    })
                  }
                >
                  Chờ vật tư
                </button>
              )}
              {reporter && item.status === "AWAITING_CONFIRMATION" && (
                <>
                  <button
                    className="button"
                    onClick={() => post("/confirm", { resolved: true })}
                  >
                    Xác nhận hoàn thành
                  </button>
                  <button
                    className="button danger"
                    onClick={() =>
                      post("/reopen", {
                        reason: "Sự cố chưa được khắc phục hoàn toàn",
                      })
                    }
                  >
                    Mở lại phiếu
                  </button>
                </>
              )}
            </div>
            {manager &&
              ["NEW", "REOPENED", "ASSIGNED"].includes(item.status) && (
                <form
                  className="section"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    post("/assign", {
                      technicianId: f.get("technicianId"),
                      note: "Phân công từ dashboard",
                    });
                  }}
                >
                  <label>
                    Phân công kỹ thuật viên
                    <select
                      name="technicianId"
                      required
                      defaultValue={item.assignedTechnician?.id ?? ""}
                    >
                      <option value="">Chọn kỹ thuật viên</option>
                      {techs.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button section">Phân công</button>
                </form>
              )}
            {(technician || manager) &&
              ["IN_PROGRESS", "WAITING_FOR_PARTS"].includes(item.status) && (
                <form className="section" onSubmit={repair}>
                  <h4>Hoàn tất sửa chữa</h4>
                  <label>
                    Nguyên nhân
                    <textarea name="rootCause" required />
                  </label>
                  <label>
                    Giải pháp
                    <textarea name="resolution" required />
                  </label>
                  <div className="form-grid">
                    <label>
                      Nhân công
                      <input name="laborCost" type="number" min="0" />
                    </label>
                    <label>
                      Chi phí ngoài
                      <input name="externalCost" type="number" min="0" />
                    </label>
                  </div>
                  <button className="button section">Gửi kết quả</button>
                </form>
              )}
            {reporter && item.status === "COMPLETED" && !item.rating && (
              <form
                className="section"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void post("/rating", {
                    rating: Number(form.get("rating")),
                    comment: form.get("comment"),
                  });
                }}
              >
                <h4>Đánh giá kết quả</h4>
                <label>
                  Số sao
                  <select name="rating" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating} sao
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nhận xét
                  <textarea name="comment" />
                </label>
                <button className="button section">Gửi đánh giá</button>
              </form>
            )}
            {item.rating && (
              <div className="success section">
                Đã đánh giá {item.rating.rating}/5 · {item.rating.comment}
              </div>
            )}
          </section>
          <section className="card section">
            <div className="card-header">
              <h3>Dòng thời gian</h3>
            </div>
            <div className="timeline">
              {item.history?.map((x: any) => (
                <div className="timeline-item" key={x.id}>
                  <b>
                    {x.fromStatus ? x.fromStatus + " → " : ""}
                    {x.toStatus}
                  </b>
                  <span>{x.note}</span>
                  <small>
                    {dateTime(x.createdAt)} · {x.actor?.fullName}
                  </small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
