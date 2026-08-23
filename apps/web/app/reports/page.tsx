"use client";
import { useEffect, useState } from "react";
import AppShell from "../../components/AppShell";
import { ErrorBox, Loading, Stat } from "../../components/UI";
import { API_URL, accessToken, api, money } from "../../lib/api";
export default function Reports() {
  const [techs, setTechs] = useState<any[] | null>(null);
  const [cost, setCost] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      api<any[]>("/reports/technicians"),
      api<any>("/reports/costs"),
    ])
      .then(([t, c]) => {
        setTechs(t);
        setCost(c);
      })
      .catch((e) => setError(e.message));
  }, []);
  async function download() {
    const r = await fetch(`${API_URL}/reports/incidents?format=csv`, {
      headers: { Authorization: `Bearer ${accessToken()}` },
    });
    if (!r.ok) {
      setError("Không thể xuất báo cáo");
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "edufix-incidents.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <AppShell
      title="Báo cáo & phân tích"
      actions={
        <button className="button" onClick={download}>
          ↓ Xuất CSV
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h2>Hiệu quả vận hành</h2>
          <p>Tổng hợp chi phí và năng suất kỹ thuật viên.</p>
        </div>
        <button className="button" onClick={download}>
          ↓ Xuất CSV
        </button>
      </div>
      <ErrorBox message={error} />
      {!techs ? (
        <Loading />
      ) : (
        <>
          <section className="grid">
            <Stat label="Kỹ thuật viên" value={techs.length} />
            <Stat
              label="Phiếu được giao"
              value={techs.reduce((s, x) => s + x.assigned, 0)}
            />
            <Stat
              label="Phiếu hoàn thành"
              value={techs.reduce((s, x) => s + x.completed, 0)}
              tone="green"
            />
            <Stat
              label="Tổng chi phí sửa chữa"
              value={money(cost?.total)}
              tone="amber"
            />
          </section>
          <section className="card section">
            <div className="card-header">
              <h2>Năng suất kỹ thuật viên</h2>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kỹ thuật viên</th>
                    <th>Được giao</th>
                    <th>Hoàn thành</th>
                    <th>Tỷ lệ</th>
                    <th>Thời gian xử lý TB</th>
                  </tr>
                </thead>
                <tbody>
                  {techs.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <b>{x.fullName}</b>
                      </td>
                      <td>{x.assigned}</td>
                      <td>{x.completed}</td>
                      <td>
                        <div className="progress" style={{ width: 130 }}>
                          <span style={{ width: `${x.completionRate}%` }} />
                        </div>{" "}
                        {x.completionRate}%
                      </td>
                      <td>{x.averageResolutionMinutes} phút</td>
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
