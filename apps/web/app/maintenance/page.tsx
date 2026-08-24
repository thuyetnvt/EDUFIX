"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, ErrorBox, Loading, Stat } from "../../components/UI";
import { api, dateTime, getCurrentUser } from "../../lib/api";
import { vi } from "../../lib/i18n";

function TaskActions({
  task,
  onDone,
  onError,
}: {
  task: any;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const checklist = Array.isArray(task.plan?.checklist)
    ? (task.plan.checklist as string[])
    : [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  async function start() {
    setBusy(true);
    try {
      await api(`/maintenance/tasks/${task.id}/start`, { method: "POST" });
      onDone();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Không thể bắt đầu công việc",
      );
    } finally {
      setBusy(false);
    }
  }
  async function complete() {
    setBusy(true);
    try {
      await api(`/maintenance/tasks/${task.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          checklistResult: checklist.map((item) => ({
            item,
            completed: Boolean(checked[item]),
            ...(notes[item] ? { note: notes[item] } : {}),
          })),
          note,
        }),
      });
      onDone();
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Không thể hoàn tất công việc",
      );
    } finally {
      setBusy(false);
    }
  }
  if (task.status === "PENDING")
    return (
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy ? "Đang gửi…" : "Bắt đầu"}
      </button>
    );
  if (task.status !== "IN_PROGRESS") return <span>—</span>;
  return (
    <details className="task-actions">
      <summary className="button">Hoàn tất</summary>
      <div className="task-checklist">
        {checklist.length === 0 ? (
          <span className="muted">Kế hoạch chưa có checklist.</span>
        ) : (
          checklist.map((item) => (
            <div className="checklist-item" key={item}>
              <label><input type="checkbox" checked={Boolean(checked[item])} onChange={(event) => setChecked((current) => ({ ...current, [item]: event.target.checked }))} />{item}</label>
              {!checked[item] && <input value={notes[item] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item]: event.target.value }))} placeholder="Lý do bỏ qua (bắt buộc nếu chưa hoàn thành)" />}
            </div>
          ))
        )}
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi chú kết quả bảo trì"
        />
        <button
          className="button"
          disabled={busy}
          onClick={() => void complete()}
        >
          {busy ? "Đang gửi…" : "Xác nhận hoàn tất"}
        </button>
      </div>
    </details>
  );
}

export default function Maintenance() {
  const [plans, setPlans] = useState<any[] | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [manager, setManager] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const load = () =>
    Promise.all([
      api<any[]>("/maintenance/plans"),
      api<any[]>("/maintenance/tasks"),
    ])
      .then(([p, t]) => {
        setPlans(p);
        setTasks(t);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
    getCurrentUser().then((user) => {
      if (["ADMIN", "FACILITY_MANAGER"].includes(user.role)) {
        setManager(true);
        Promise.all([
          api<any>("/assets?pageSize=100"),
          api<any[]>("/users?role=TECHNICIAN"),
        ]).then(([assetResult, technicians]) => {
          setAssets(assetResult.items);
          setTechs(technicians);
        });
      }
    });
  }, []);
  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assignedTechnicianId = String(form.get("assignedTechnicianId") ?? "");
    try {
      await api("/maintenance/plans", {
        method: "POST",
        body: JSON.stringify({
          assetId: form.get("assetId"),
          name: form.get("name"),
          recurrenceType: form.get("recurrenceType"),
          interval: Number(form.get("interval")),
          startDate: form.get("startDate"),
          ...(assignedTechnicianId ? { assignedTechnicianId } : {}),
          checklist: String(form.get("checklist"))
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo kế hoạch",
      );
    }
  }
  return (
    <AppShell title="Bảo trì định kỳ">
      <ErrorBox message={error} />
      {!plans ? (
        <Loading />
      ) : (
        <>
          <section className="grid">
            <Stat
              label="Kế hoạch đang chạy"
              value={plans.filter((x) => x.active).length}
            />
            <Stat
              label="Công việc chờ"
              value={tasks.filter((x) => x.status === "PENDING").length}
              tone="amber"
            />
            <Stat
              label="Đang thực hiện"
              value={tasks.filter((x) => x.status === "IN_PROGRESS").length}
            />
            <Stat
              label="Đã hoàn thành"
              value={tasks.filter((x) => x.status === "COMPLETED").length}
              tone="green"
            />
          </section>
          {manager && (
            <section className="card section">
              <div className="card-header">
                <h2>Tạo kế hoạch bảo trì</h2>
              </div>
              <form className="form-grid" onSubmit={createPlan}>
                <label>
                  Tên kế hoạch
                  <input name="name" minLength={3} required />
                </label>
                <label>
                  Thiết bị
                  <select name="assetId" required>
                    <option value="">Chọn thiết bị</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.assetCode} · {asset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Chu kỳ
                  <select name="recurrenceType">
                    <option value="MONTHLY">Hàng tháng</option>
                    <option value="QUARTERLY">Hàng quý</option>
                    <option value="YEARLY">Hàng năm</option>
                    <option value="WEEKLY">Hàng tuần</option>
                    <option value="ONE_TIME">Một lần</option>
                  </select>
                </label>
                <label>
                  Số chu kỳ
                  <input
                    name="interval"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </label>
                <label>
                  Ngày bắt đầu
                  <input name="startDate" type="date" required />
                </label>
                <label>
                  Kỹ thuật viên
                  <select name="assignedTechnicianId">
                    <option value="">Chưa phân công</option>
                    {techs.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  Checklist (mỗi dòng một việc)
                  <textarea
                    name="checklist"
                    placeholder={
                      "Kiểm tra nguồn điện\nVệ sinh thiết bị\nChạy thử"
                    }
                    required
                  />
                </label>
                <div className="full">
                  <button className="button">Tạo kế hoạch</button>
                </div>
              </form>
            </section>
          )}
          <section className="card section">
            <div className="card-header">
              <h2>Công việc bảo trì</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Thiết bị</th>
                    <th>Kế hoạch</th>
                    <th>Hạn</th>
                    <th>Kỹ thuật viên</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((x) => (
                    <tr key={x.id}>
                      <td>{x.asset?.name}</td>
                      <td>{x.plan?.name}</td>
                      <td>{dateTime(x.dueAt)}</td>
                      <td>{x.technician?.fullName ?? "Chưa giao"}</td>
                      <td>
                        <Badge value={x.status} kind="maintenanceStatus" />
                      </td>
                      <td>
                        <Link className="link-button" href={`/maintenance/tasks/${x.id}`}>Chi tiết</Link>{" "}
                        <TaskActions
                          task={x}
                          onDone={() => void load()}
                          onError={setError}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card section">
            <div className="card-header">
              <h2>Kế hoạch</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Thiết bị</th>
                    <th>Chu kỳ</th>
                    <th>Lần kế tiếp</th>
                    <th>Checklist</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((x) => (
                    <tr key={x.id}>
                      <td>{x.name}</td>
                      <td>{x.asset?.name}</td>
                      <td>
                        {x.interval} {vi(x.recurrenceType, "recurrence")}
                      </td>
                      <td>{dateTime(x.nextDueAt)}</td>
                      <td>{x.checklist?.length ?? 0} mục</td>
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
