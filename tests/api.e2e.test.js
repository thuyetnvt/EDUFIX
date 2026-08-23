const test = require("node:test");
const assert = require("node:assert/strict");

const base = process.env.EDUFIX_E2E_URL;
const password = process.env.DEMO_PASSWORD ?? "ChangeMe123!";

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function login(email) {
  const { response, body } = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 201);
  assert.ok(body.accessToken);
  assert.ok(body.refreshToken);
  return body;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test(
  "EduFix API health, RBAC and full incident workflow",
  { skip: !base },
  async () => {
    const health = await request("/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.body.status, "ok");

    const [manager, reporter, technician] = await Promise.all([
      login("manager@edufix.local"),
      login("reporter1@edufix.local"),
      login("tech1@edufix.local"),
    ]);

    const forbiddenUsers = await request("/users", {
      headers: auth(reporter.accessToken),
    });
    assert.equal(forbiddenUsers.response.status, 403);

    const forbiddenMaintenance = await request("/maintenance/tasks", {
      headers: auth(reporter.accessToken),
    });
    assert.equal(forbiddenMaintenance.response.status, 403);

    const refreshed = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: reporter.refreshToken }),
    });
    assert.equal(refreshed.response.status, 201);
    assert.ok(refreshed.body.accessToken);
    const reusedRefresh = await request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: reporter.refreshToken }),
    });
    assert.equal(reusedRefresh.response.status, 401);

    const allAssets = await request("/assets?pageSize=100", {
      headers: auth(manager.accessToken),
    });
    assert.equal(allAssets.response.status, 200);
    let asset;
    for (const candidate of allAssets.body.items) {
      const existing = await request(
        `/incidents?assetId=${candidate.id}&pageSize=100`,
        { headers: auth(manager.accessToken) },
      );
      const openStatuses = new Set([
        "NEW",
        "ASSIGNED",
        "IN_PROGRESS",
        "WAITING_FOR_PARTS",
        "AWAITING_CONFIRMATION",
        "REOPENED",
      ]);
      if (!existing.body.items.some((item) => openStatuses.has(item.status))) {
        asset = candidate;
        break;
      }
    }
    assert.ok(asset?.id, "Seed data phải có ít nhất một thiết bị không có phiếu mở");
    const qr = await request(`/assets/${asset.id}/qr`, {
      headers: auth(reporter.accessToken),
    });
    assert.equal(qr.response.status, 200);
    assert.match(qr.body.qrDataUrl, /^data:image\/png;base64,/);
    assert.match(qr.body.url, /\/scan\//);

    const created = await request("/incidents", {
      method: "POST",
      headers: auth(reporter.accessToken),
      body: JSON.stringify({
        assetId: asset.id,
        title: "Kiểm thử E2E thiết bị không hoạt động",
        description: "Phiếu tự động dùng để xác nhận toàn bộ quy trình EduFix.",
      }),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.status, "NEW");
    assert.ok(created.body.aiSuggestion);
    assert.ok(Array.isArray(created.body.possibleDuplicates));

    const technicianBeforeAssignment = await request(
      `/incidents/${created.body.id}`,
      { headers: auth(technician.accessToken) },
    );
    assert.equal(technicianBeforeAssignment.response.status, 403);

    const imageForm = new FormData();
    imageForm.append(
      "file",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPp8AAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "e2e.png",
    );
    imageForm.append("kind", "INCIDENT");
    const uploadResponse = await fetch(
      `${base}/incidents/${created.body.id}/attachments`,
      {
        method: "POST",
        headers: auth(reporter.accessToken),
        body: imageForm,
      },
    );
    assert.equal(uploadResponse.status, 201);
    const attachment = await uploadResponse.json();
    const servedFile = await fetch(
      `${new URL(base).origin}${attachment.fileUrl}`,
    );
    assert.equal(servedFile.status, 200);

    const fakeImageForm = new FormData();
    fakeImageForm.append(
      "file",
      new Blob([Buffer.from("not an image")], { type: "image/png" }),
      "fake.png",
    );
    const fakeImageResponse = await fetch(
      `${base}/incidents/${created.body.id}/attachments`,
      {
        method: "POST",
        headers: auth(reporter.accessToken),
        body: fakeImageForm,
      },
    );
    assert.equal(fakeImageResponse.status, 400);

    const assigned = await request(`/incidents/${created.body.id}/assign`, {
      method: "POST",
      headers: auth(manager.accessToken),
      body: JSON.stringify({
        technicianId: technician.user.id,
        note: "Phân công từ kiểm thử E2E",
      }),
    });
    assert.equal(assigned.response.status, 201);
    assert.equal(assigned.body.status, "ASSIGNED");

    const started = await request(`/incidents/${created.body.id}/transition`, {
      method: "POST",
      headers: auth(technician.accessToken),
      body: JSON.stringify({ status: "IN_PROGRESS", note: "Bắt đầu kiểm tra" }),
    });
    assert.equal(started.body.status, "IN_PROGRESS");

    const repaired = await request(
      `/incidents/${created.body.id}/repair-result`,
      {
        method: "POST",
        headers: auth(technician.accessToken),
        body: JSON.stringify({
          rootCause: "Dây nguồn lỏng",
          resolution: "Cắm lại dây nguồn và kiểm tra tải",
          laborCost: 50000,
          externalCost: 0,
        }),
      },
    );
    assert.equal(repaired.body.status, "AWAITING_CONFIRMATION");

    const completed = await request(`/incidents/${created.body.id}/confirm`, {
      method: "POST",
      headers: auth(reporter.accessToken),
      body: JSON.stringify({ resolved: true }),
    });
    assert.equal(completed.body.status, "COMPLETED");

    const rating = await request(`/incidents/${created.body.id}/rating`, {
      method: "POST",
      headers: auth(reporter.accessToken),
      body: JSON.stringify({ rating: 5, comment: "Quy trình hoạt động tốt" }),
    });
    assert.equal(rating.response.status, 201);
    assert.equal(rating.body.rating, 5);

    const detail = await request(`/incidents/${created.body.id}`, {
      headers: auth(reporter.accessToken),
    });
    assert.equal(detail.body.history.at(-1).toStatus, "COMPLETED");
    assert.equal(detail.body.asset.status, "ACTIVE");
  },
);
