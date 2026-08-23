"use client";
import { FormEvent, useState } from "react";
import { API_URL, saveSession } from "../../lib/api";
import { ErrorBox } from "../../components/UI";

export default function Login() {
  const [email, setEmail] = useState("manager@edufix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          Array.isArray(data.message) ? data.message.join(", ") : data.message,
        );
      saveSession(data.accessToken, data.refreshToken);
      const role = data.user?.role;
      window.location.href =
        role === "REPORTER"
          ? "/mobile/home"
          : role === "TECHNICIAN"
            ? "/technician/home"
            : "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <section className="login-art">
        <div className="login-logo">
          <span>E</span> EduFix
        </div>
        <h1>Mọi thiết bị đều được chăm sóc đúng lúc.</h1>
        <p>
          Một nơi duy nhất để báo sự cố, điều phối kỹ thuật viên, quản lý bảo
          trì và theo dõi toàn bộ vòng đời tài sản trường học.
        </p>
      </section>
      <section className="login-panel">
        <form className="form" onSubmit={submit}>
          <p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p>
          <h2>Đăng nhập EduFix</h2>
          <p className="muted">Sử dụng tài khoản được nhà trường cấp.</p>
          <ErrorBox message={error} />
          <div className="form-grid">
            <label className="full">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <label className="full">
              Mật khẩu
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
          </div>
          <button
            className="button"
            disabled={busy}
            style={{ width: "100%", marginTop: 18 }}
          >
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          <div className="demo-accounts">
            <b>Tài khoản demo</b>
            <br />
            Quản lý: manager@edufix.local
            <br />
            Kỹ thuật: tech1@edufix.local
            <br />
            Người báo: reporter1@edufix.local
            <br />
            Mật khẩu chung: ChangeMe123!
          </div>
        </form>
      </section>
    </main>
  );
}
