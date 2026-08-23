"use client";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { Badge, ErrorBox, Loading } from "../../components/UI";
import { api, dateTime, getCurrentUser } from "../../lib/api";
export default function Users() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const load = () =>
    api<any[]>("/users")
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
    getCurrentUser().then((user) => setIsAdmin(user.role === "ADMIN"));
  }, []);
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể tạo tài khoản",
      );
    }
  }
  async function toggle(x: any) {
    try {
      await api(`/users/${x.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !x.active }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đủ quyền");
    }
  }
  return (
    <AppShell title="Người dùng">
      <div className="page-head">
        <div>
          <h2>Tài khoản hệ thống</h2>
          <p>Quản trị viên, quản lý cơ sở, kỹ thuật viên và người báo.</p>
        </div>
      </div>
      <ErrorBox message={error} />
      {isAdmin && (
        <section className="card section">
          <div className="card-header">
            <h2>Tạo tài khoản</h2>
          </div>
          <form className="form-grid" onSubmit={createUser}>
            <label>
              Họ tên
              <input name="fullName" required />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Mật khẩu ban đầu
              <input name="password" type="password" minLength={8} required />
            </label>
            <label>
              Vai trò
              <select name="role">
                <option value="REPORTER">Người báo</option>
                <option value="TECHNICIAN">Kỹ thuật viên</option>
                <option value="FACILITY_MANAGER">Quản lý</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </label>
            <label>
              Đơn vị
              <input name="department" />
            </label>
            <label>
              Điện thoại
              <input name="phone" />
            </label>
            <div className="full">
              <button className="button">Tạo tài khoản</button>
            </div>
          </form>
        </section>
      )}
      {!items ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Đơn vị</th>
                <th>Đăng nhập gần nhất</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>
                    <b>{x.fullName}</b>
                  </td>
                  <td>{x.email}</td>
                  <td>
                    <Badge value={x.role} kind="role" />
                  </td>
                  <td>{x.department ?? "—"}</td>
                  <td>{dateTime(x.lastLoginAt)}</td>
                  <td>
                    <Badge
                      value={x.active ? "ACTIVE" : "DISABLED"}
                      kind="accountStatus"
                    />
                  </td>
                  <td>
                    {isAdmin ? (
                      <button
                        className="button secondary"
                        onClick={() => toggle(x)}
                      >
                        {x.active ? "Khóa" : "Mở khóa"}
                      </button>
                    ) : (
                      <span className="muted">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
