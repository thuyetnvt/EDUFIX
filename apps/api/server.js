const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.API_PORT || 4000);
const DATA_FILE = path.join(__dirname, "data.json");
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "ChangeMe123!";
const tokens = new Map();

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}
function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function now() {
  return new Date().toISOString();
}
function seed() {
  const users = [
    ["admin@edufix.local", "Quản trị viên", "ADMIN"],
    ["manager@edufix.local", "Quản lý cơ sở vật chất", "FACILITY_MANAGER"],
    ["tech1@edufix.local", "Nguyễn Văn Kỹ thuật", "TECHNICIAN"],
    ["tech2@edufix.local", "Trần Minh Kỹ thuật", "TECHNICIAN"],
    ["reporter@edufix.local", "Giảng viên Demo", "REPORTER"],
  ].map(([email, fullName, role]) => ({
    id: uid("usr"),
    email,
    fullName,
    role,
    passwordHash: hash(DEMO_PASSWORD),
    active: true,
  }));
  const locations = ["A203", "A204", "LAB-01", "B201", "THU-VIEN"].map(
    (name, i) => ({
      id: uid("loc"),
      name: `Phòng ${name}`,
      code: name,
      type: "ROOM",
      order: i,
    }),
  );
  const categories = [
    ["PROJECTOR", "Máy chiếu"],
    ["COMPUTER", "Máy tính"],
    ["AIR_CONDITIONER", "Điều hòa"],
    ["PRINTER", "Máy in"],
    ["NETWORK", "Thiết bị mạng"],
  ].map(([code, name]) => ({ id: uid("cat"), code, name }));
  const specs = [
    ["MC-A203-01", "Máy chiếu Epson EB-X06", 0, 0, "Epson"],
    ["PC-LAB01-12", "Máy tính Dell OptiPlex", 1, 2, "Dell"],
    ["AC-B201-01", "Điều hòa Daikin", 2, 3, "Daikin"],
    ["PR-HC-01", "Máy in HP LaserJet", 3, 1, "HP"],
    ["NW-LIB-01", "Router Wi-Fi", 4, 4, "Cisco"],
  ];
  const assets = specs.map(
    ([assetCode, name, category, location, manufacturer]) => ({
      id: uid("ast"),
      assetCode,
      name,
      categoryId: categories[category].id,
      category: categories[category].name,
      locationId: locations[location].id,
      location: locations[location].name,
      manufacturer,
      status: "ACTIVE",
      qrToken: `demo-${assetCode.toLowerCase()}`,
      createdAt: now(),
    }),
  );
  const incident = {
    id: uid("inc"),
    incidentCode: "INC-2026-00001",
    assetId: assets[0].id,
    reporterId: users[4].id,
    assignedTechnicianId: users[2].id,
    title: "Máy chiếu không nhận tín hiệu HDMI",
    description: "Máy chiếu vẫn sáng nhưng không nhận tín hiệu từ máy tính.",
    category: "PROJECTOR",
    priority: "HIGH",
    status: "ASSIGNED",
    dueAt: new Date(Date.now() + 14400000).toISOString(),
    createdAt: now(),
    history: [
      {
        id: uid("hist"),
        actorId: users[4].id,
        fromStatus: null,
        toStatus: "NEW",
        note: "Tạo phiếu demo",
        createdAt: now(),
      },
    ],
  };
  return {
    users,
    locations,
    categories,
    assets,
    incidents: [incident],
    notifications: [
      {
        id: uid("not"),
        userId: users[2].id,
        title: "Công việc mới",
        message: "Bạn được giao INC-2026-00001",
        read: false,
        createdAt: now(),
      },
    ],
  };
}
function load() {
  if (!fs.existsSync(DATA_FILE))
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed(), null, 2));
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
let db = load();
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  });
  res.end(body);
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON không hợp lệ"));
      }
    });
  });
}
function auth(req) {
  const value = req.headers.authorization || "";
  return tokens.get(value.replace("Bearer ", ""));
}
function classify(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("chiếu") || text.includes("hdmi"))
    return {
      category: "PROJECTOR",
      issueType: "NO_SIGNAL",
      suggestedPriority: "HIGH",
      summary: "Sự cố tín hiệu máy chiếu",
      confidence: 0.9,
      possibleCauses: [
        "Cáp HDMI hỏng",
        "Sai nguồn đầu vào",
        "Cổng kết nối bị lỗi",
      ],
    };
  if (text.includes("điều hòa") || text.includes("lạnh"))
    return {
      category: "AIR_CONDITIONER",
      issueType: "COOLING",
      suggestedPriority: "HIGH",
      summary: "Điều hòa hoạt động không đạt yêu cầu",
      confidence: 0.86,
      possibleCauses: ["Thiếu môi chất lạnh", "Lưới lọc bẩn"],
    };
  if (text.includes("máy in") || text.includes("giấy"))
    return {
      category: "PRINTER",
      issueType: "PAPER_JAM",
      suggestedPriority: "MEDIUM",
      summary: "Sự cố máy in",
      confidence: 0.88,
      possibleCauses: ["Kẹt giấy", "Khay giấy lệch"],
    };
  if (text.includes("máy tính") || text.includes("khởi động"))
    return {
      category: "COMPUTER",
      issueType: "BOOT_FAILURE",
      suggestedPriority: "HIGH",
      summary: "Máy tính không khởi động",
      confidence: 0.84,
      possibleCauses: [
        "Nguồn điện hoặc bộ nguồn lỗi",
        "RAM lỏng",
        "Ổ lưu trữ gặp sự cố",
      ],
    };
  return {
    category: "OTHER",
    issueType: "GENERAL",
    suggestedPriority: "MEDIUM",
    summary: title,
    confidence: 0.55,
    possibleCauses: ["Cần kỹ thuật viên kiểm tra trực tiếp"],
  };
}
function enrichIncident(item) {
  const asset = db.assets.find((x) => x.id === item.assetId);
  const reporter = db.users.find((x) => x.id === item.reporterId);
  const technician = db.users.find((x) => x.id === item.assignedTechnicianId);
  return {
    ...item,
    asset,
    reporter: reporter && { fullName: reporter.fullName },
    assignedTechnician: technician && { fullName: technician.fullName },
  };
}
const transitions = {
  NEW: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_PARTS", "AWAITING_CONFIRMATION", "CANCELLED"],
  WAITING_FOR_PARTS: ["IN_PROGRESS", "CANCELLED"],
  AWAITING_CONFIRMATION: ["COMPLETED", "REOPENED"],
  REOPENED: ["ASSIGNED", "IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
};
async function route(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const current = auth(req);
  if (req.method === "GET" && url.pathname === "/api/v1/health")
    return json(res, 200, { status: "ok", service: "edufix-api" });
  if (req.method === "POST" && url.pathname === "/api/v1/auth/login") {
    const input = await body(req);
    const user = db.users.find(
      (x) =>
        x.email === input.email &&
        x.active &&
        x.passwordHash === hash(input.password || ""),
    );
    if (!user)
      return json(res, 401, { message: "Email hoặc mật khẩu không đúng" });
    const token = crypto.randomBytes(24).toString("hex");
    tokens.set(token, user);
    return json(res, 200, {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  }
  if (!current) return json(res, 401, { message: "Vui lòng đăng nhập" });
  if (req.method === "GET" && url.pathname === "/api/v1/auth/me")
    return json(res, 200, {
      id: current.id,
      email: current.email,
      fullName: current.fullName,
      role: current.role,
    });
  if (req.method === "GET" && url.pathname === "/api/v1/dashboard/summary") {
    const open = db.incidents.filter(
      (x) => !["COMPLETED", "CANCELLED"].includes(x.status),
    );
    const overdue = open.filter(
      (x) => x.dueAt && new Date(x.dueAt) < new Date(),
    );
    return json(res, 200, {
      assets: db.assets.length,
      faulty: db.assets.filter((x) =>
        ["FAULTY", "REPAIRING"].includes(x.status),
      ).length,
      open: open.length,
      overdue: overdue.length,
      recent: db.incidents
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
        .map(enrichIncident),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/v1/assets") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    return json(
      res,
      200,
      db.assets.filter(
        (x) => !q || `${x.name} ${x.assetCode}`.toLowerCase().includes(q),
      ),
    );
  }
  if (
    req.method === "GET" &&
    parts[0] === "api" &&
    parts[1] === "v1" &&
    parts[2] === "scan"
  ) {
    const asset = db.assets.find((x) => x.qrToken === parts[3]);
    return json(
      res,
      asset ? 200 : 404,
      asset || { message: "Không tìm thấy thiết bị" },
    );
  }
  if (req.method === "GET" && url.pathname === "/api/v1/incidents") {
    const list = db.incidents
      .filter((x) => current.role !== "REPORTER" || x.reporterId === current.id)
      .map(enrichIncident);
    return json(res, 200, list);
  }
  if (req.method === "POST" && url.pathname === "/api/v1/incidents") {
    const input = await body(req);
    const asset = db.assets.find((x) => x.id === input.assetId);
    if (!asset || !input.title || !input.description)
      return json(res, 400, { message: "Thiếu thiết bị, tiêu đề hoặc mô tả" });
    const ai = classify(input.title, input.description);
    const item = {
      id: uid("inc"),
      incidentCode: `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      assetId: asset.id,
      reporterId: current.id,
      title: input.title,
      description: input.description,
      category: ai.category,
      priority: input.priority || ai.suggestedPriority,
      status: "NEW",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: now(),
      history: [
        {
          id: uid("hist"),
          actorId: current.id,
          fromStatus: null,
          toStatus: "NEW",
          note: "Tạo phiếu",
          createdAt: now(),
        },
      ],
      aiSuggestion: ai,
    };
    db.incidents.unshift(item);
    asset.status = "FAULTY";
    save();
    return json(res, 201, enrichIncident(item));
  }
  if (
    req.method === "POST" &&
    parts[2] === "incidents" &&
    parts[4] === "assign"
  ) {
    if (!["ADMIN", "FACILITY_MANAGER"].includes(current.role))
      return json(res, 403, { message: "Bạn không có quyền phân công" });
    const item = db.incidents.find((x) => x.id === parts[3]);
    const input = await body(req);
    const tech = db.users.find(
      (x) => x.id === input.technicianId && x.role === "TECHNICIAN",
    );
    if (!item || !tech)
      return json(res, 404, {
        message: "Không tìm thấy phiếu hoặc kỹ thuật viên",
      });
    item.assignedTechnicianId = tech.id;
    item.status = "ASSIGNED";
    item.history.push({
      id: uid("hist"),
      actorId: current.id,
      fromStatus: "NEW",
      toStatus: "ASSIGNED",
      note: "Phân công kỹ thuật viên",
      createdAt: now(),
    });
    db.notifications.push({
      id: uid("not"),
      userId: tech.id,
      title: "Công việc mới",
      message: `Bạn được giao ${item.incidentCode}`,
      read: false,
      createdAt: now(),
    });
    save();
    return json(res, 200, enrichIncident(item));
  }
  if (
    req.method === "POST" &&
    parts[2] === "incidents" &&
    parts[4] === "transition"
  ) {
    const item = db.incidents.find((x) => x.id === parts[3]);
    const input = await body(req);
    if (!item || !transitions[item.status].includes(input.status))
      return json(res, 400, {
        message: `Không thể chuyển từ ${item?.status} sang ${input.status}`,
      });
    item.history.push({
      id: uid("hist"),
      actorId: current.id,
      fromStatus: item.status,
      toStatus: input.status,
      note: input.note || "",
      createdAt: now(),
    });
    item.status = input.status;
    if (input.status === "COMPLETED") {
      item.completedAt = now();
      const asset = db.assets.find((x) => x.id === item.assetId);
      if (asset) asset.status = "ACTIVE";
    }
    save();
    return json(res, 200, enrichIncident(item));
  }
  if (req.method === "GET" && url.pathname === "/api/v1/notifications")
    return json(
      res,
      200,
      db.notifications.filter((x) => x.userId === current.id),
    );
  return json(res, 404, { message: "Không tìm thấy endpoint" });
}
http
  .createServer((req, res) =>
    route(req, res).catch((error) =>
      json(res, 500, { message: error.message }),
    ),
  )
  .listen(PORT, () =>
    console.log(`EduFix API running at http://localhost:${PORT}`),
  );
