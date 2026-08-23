import {
  AssetStatus,
  IncidentStatus,
  LocationType,
  MaintenanceTaskStatus,
  NotificationType,
  PrismaClient,
  Priority,
  RecurrenceType,
  Role,
  StockTransactionType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000);
const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

async function main() {
  const passwordHash = await bcrypt.hash(
    process.env.DEMO_PASSWORD ?? "ChangeMe123!",
    10,
  );
  const [legacyReporter, numberedReporter] = await Promise.all([
    prisma.user.findUnique({ where: { email: "reporter@edufix.local" } }),
    prisma.user.findUnique({ where: { email: "reporter1@edufix.local" } }),
  ]);
  if (legacyReporter && !numberedReporter) {
    await prisma.user.update({
      where: { id: legacyReporter.id },
      data: { email: "reporter1@edufix.local" },
    });
  }
  const userSpecs: Array<[string, string, Role, string]> = [
    ["admin@edufix.local", "Quản trị viên", Role.ADMIN, "Ban quản trị"],
    [
      "manager@edufix.local",
      "Quản lý cơ sở vật chất",
      Role.FACILITY_MANAGER,
      "Phòng Cơ sở vật chất",
    ],
    [
      "tech1@edufix.local",
      "Nguyễn Văn Kỹ thuật",
      Role.TECHNICIAN,
      "Tổ Điện - Điện tử",
    ],
    [
      "tech2@edufix.local",
      "Trần Minh Kỹ thuật",
      Role.TECHNICIAN,
      "Tổ Công nghệ thông tin",
    ],
    [
      "reporter1@edufix.local",
      "Giảng viên Demo",
      Role.REPORTER,
      "Khoa Công nghệ thông tin",
    ],
    [
      "reporter2@edufix.local",
      "Nguyễn Thu Hà",
      Role.REPORTER,
      "Khoa Ngoại ngữ",
    ],
    ["reporter3@edufix.local", "Lê Quốc Bảo", Role.REPORTER, "Phòng Đào tạo"],
    ["reporter4@edufix.local", "Phạm Minh Anh", Role.REPORTER, "Thư viện"],
    [
      "reporter5@edufix.local",
      "Vũ Hoàng Nam",
      Role.REPORTER,
      "Phòng Hành chính",
    ],
  ];
  const users = await Promise.all(
    userSpecs.map(([email, fullName, role, department]) =>
      prisma.user.upsert({
        where: { email },
        update: { fullName, role, department, active: true },
        create: { email, fullName, role, department, passwordHash },
      }),
    ),
  );
  const admin = users[0];
  const manager = users[1];
  const technicians = users.slice(2, 4);
  const reporters = users.slice(4);

  const campus = await prisma.location.upsert({
    where: { code: "CS-HN" },
    update: { type: LocationType.CAMPUS },
    create: { name: "Cơ sở Hà Nội", code: "CS-HN", type: LocationType.CAMPUS },
  });
  const buildingA = await prisma.location.upsert({
    where: { code: "TOA-A" },
    update: { parentId: campus.id, type: LocationType.BUILDING },
    create: {
      name: "Tòa nhà A",
      code: "TOA-A",
      type: LocationType.BUILDING,
      parentId: campus.id,
    },
  });
  const buildingB = await prisma.location.upsert({
    where: { code: "TOA-B" },
    update: { parentId: campus.id, type: LocationType.BUILDING },
    create: {
      name: "Tòa nhà B",
      code: "TOA-B",
      type: LocationType.BUILDING,
      parentId: campus.id,
    },
  });
  const floorA2 = await prisma.location.upsert({
    where: { code: "A-TANG-2" },
    update: { parentId: buildingA.id, type: LocationType.FLOOR },
    create: {
      name: "Tầng 2 - Tòa A",
      code: "A-TANG-2",
      type: LocationType.FLOOR,
      parentId: buildingA.id,
    },
  });
  const floorB2 = await prisma.location.upsert({
    where: { code: "B-TANG-2" },
    update: { parentId: buildingB.id, type: LocationType.FLOOR },
    create: {
      name: "Tầng 2 - Tòa B",
      code: "B-TANG-2",
      type: LocationType.FLOOR,
      parentId: buildingB.id,
    },
  });
  const roomSpecs: Array<[string, string, string]> = [
    ["A203", "Phòng A203", floorA2.id],
    ["A204", "Phòng A204", floorA2.id],
    ["LAB-01", "Phòng máy LAB-01", floorA2.id],
    ["B201", "Phòng B201", floorB2.id],
    ["THU-VIEN", "Thư viện", floorB2.id],
  ];
  const rooms = await Promise.all(
    roomSpecs.map(([code, name, parentId]) =>
      prisma.location.upsert({
        where: { code },
        update: { name, parentId, type: LocationType.ROOM },
        create: { name, code, type: LocationType.ROOM, parentId },
      }),
    ),
  );

  const categorySpecs = [
    ["PROJECTOR", "Máy chiếu"],
    ["COMPUTER", "Máy tính"],
    ["AIR_CONDITIONER", "Điều hòa"],
    ["PRINTER", "Máy in"],
    ["NETWORK", "Thiết bị mạng"],
  ] as const;
  const categories = await Promise.all(
    categorySpecs.map(([code, name]) =>
      prisma.assetCategory.upsert({
        where: { code },
        update: { name, active: true },
        create: { code, name },
      }),
    ),
  );
  const primaryAssets = [
    ["MC-A203-01", "Máy chiếu Epson EB-X06", 0, 0, "Epson"],
    ["PC-LAB01-12", "Máy tính Dell OptiPlex", 1, 2, "Dell"],
    ["AC-B201-01", "Điều hòa Daikin", 2, 3, "Daikin"],
    ["PR-HC-01", "Máy in HP LaserJet", 3, 1, "HP"],
    ["NW-LIB-01", "Router Wi-Fi", 4, 4, "Cisco"],
  ] as const;
  const generated = Array.from({ length: 25 }, (_, index) => {
    const categoryIndex = index % categories.length;
    const roomIndex = index % rooms.length;
    const number = String(index + 2).padStart(2, "0");
    const prefixes = ["MC", "PC", "AC", "PR", "NW"];
    const names = [
      "Máy chiếu BenQ",
      "Máy tính HP ProDesk",
      "Điều hòa Panasonic",
      "Máy in Canon",
      "Access Point Wi-Fi",
    ];
    const brands = ["BenQ", "HP", "Panasonic", "Canon", "Ubiquiti"];
    return [
      `${prefixes[categoryIndex]}-${rooms[roomIndex].code}-${number}`,
      `${names[categoryIndex]} ${number}`,
      categoryIndex,
      roomIndex,
      brands[categoryIndex],
    ] as const;
  });
  const assets = [];
  for (const [assetCode, name, categoryIndex, roomIndex, manufacturer] of [
    ...primaryAssets,
    ...generated,
  ]) {
    assets.push(
      await prisma.asset.upsert({
        where: { assetCode },
        update: {
          name,
          categoryId: categories[categoryIndex].id,
          locationId: rooms[roomIndex].id,
          manufacturer,
          active: true,
        },
        create: {
          assetCode,
          name,
          manufacturer,
          categoryId: categories[categoryIndex].id,
          locationId: rooms[roomIndex].id,
          qrToken: `demo-${assetCode.toLowerCase()}`,
          status: AssetStatus.ACTIVE,
          purchaseDate: new Date("2024-01-15"),
          warrantyUntil: new Date("2027-01-15"),
        },
      }),
    );
  }

  for (const [priority, responseMinutes, resolutionMinutes] of [
    [Priority.URGENT, 30, 120],
    [Priority.HIGH, 60, 240],
    [Priority.MEDIUM, 240, 1440],
    [Priority.LOW, 480, 4320],
  ] as const) {
    await prisma.priorityTarget.upsert({
      where: { priority },
      update: {
        responseMinutes,
        resolutionMinutes,
        warningPercent: 80,
        updatedById: manager.id,
      },
      create: {
        priority,
        responseMinutes,
        resolutionMinutes,
        warningPercent: 80,
        updatedById: manager.id,
      },
    });
  }

  const issueTemplates = [
    [
      "Máy chiếu không nhận tín hiệu HDMI",
      "Máy vẫn có nguồn nhưng không hiển thị hình ảnh",
      "PROJECTOR",
    ],
    [
      "Máy tính không khởi động",
      "Bấm nút nguồn nhưng máy không hoạt động",
      "COMPUTER",
    ],
    [
      "Điều hòa không làm lạnh",
      "Điều hòa chạy nhưng nhiệt độ phòng không giảm",
      "AIR_CONDITIONER",
    ],
    ["Máy in bị kẹt giấy", "Giấy bị kẹt bên trong khay nạp", "PRINTER"],
    ["Wi-Fi chập chờn", "Kết nối mạng thường xuyên bị ngắt", "NETWORK"],
  ] as const;
  const statuses = [
    IncidentStatus.NEW,
    IncidentStatus.ASSIGNED,
    IncidentStatus.IN_PROGRESS,
    IncidentStatus.WAITING_FOR_PARTS,
    IncidentStatus.AWAITING_CONFIRMATION,
    IncidentStatus.COMPLETED,
    IncidentStatus.CANCELLED,
    IncidentStatus.REOPENED,
  ];
  const priorities = [
    Priority.URGENT,
    Priority.HIGH,
    Priority.MEDIUM,
    Priority.LOW,
  ];
  const incidentIds: string[] = [];
  for (let index = 0; index < 20; index++) {
    const code = `INC-2026-${String(index + 1).padStart(5, "0")}`;
    const template = issueTemplates[index % issueTemplates.length];
    const status = statuses[index % statuses.length];
    const priority = priorities[index % priorities.length];
    const technician = technicians[index % technicians.length];
    const reporter = reporters[index % reporters.length];
    const asset = assets[index % assets.length];
    const createdAt = hoursAgo(120 - index * 4);
    const completed = status === IncidentStatus.COMPLETED;
    const incident = await prisma.incident.upsert({
      where: { incidentCode: code },
      update: {
        assetId: asset.id,
        reporterId: reporter.id,
        assignedTechnicianId:
          status === IncidentStatus.NEW ? null : technician.id,
        title: template[0],
        description: template[1],
        category: template[2],
        priority,
        status,
        dueAt: hoursAgo(90 - index * 3),
        rootCause: completed ? "Linh kiện hoặc kết nối bị lỗi" : null,
        resolution: completed
          ? "Đã kiểm tra và thay thế linh kiện cần thiết"
          : null,
        completedAt: completed ? hoursAgo(20 - index) : null,
      },
      create: {
        incidentCode: code,
        assetId: asset.id,
        reporterId: reporter.id,
        assignedTechnicianId:
          status === IncidentStatus.NEW ? null : technician.id,
        title: template[0],
        description: template[1],
        category: template[2],
        priority,
        status,
        dueAt: hoursAgo(90 - index * 3),
        createdAt,
        firstRespondedAt:
          status !== IncidentStatus.NEW
            ? new Date(createdAt.getTime() + 30 * 60_000)
            : null,
        rootCause: completed ? "Linh kiện hoặc kết nối bị lỗi" : null,
        resolution: completed
          ? "Đã kiểm tra và thay thế linh kiện cần thiết"
          : null,
        laborCost: completed ? 100_000 : null,
        completedAt: completed ? hoursAgo(20 - index) : null,
        aiSuggestion: {
          provider: "rule-based",
          category: template[2],
          confidence: 0.86,
        },
      },
    });
    incidentIds.push(incident.id);
    if (
      (await prisma.incidentStatusHistory.count({
        where: { incidentId: incident.id },
      })) === 0
    ) {
      await prisma.incidentStatusHistory.create({
        data: {
          incidentId: incident.id,
          actorId: reporter.id,
          toStatus: IncidentStatus.NEW,
          note: "Tạo từ dữ liệu demo",
          createdAt,
        },
      });
      if (status !== IncidentStatus.NEW)
        await prisma.incidentStatusHistory.create({
          data: {
            incidentId: incident.id,
            actorId: manager.id,
            fromStatus: IncidentStatus.NEW,
            toStatus:
              status === IncidentStatus.REOPENED
                ? IncidentStatus.ASSIGNED
                : status,
            note: "Cập nhật dữ liệu demo",
            createdAt: new Date(createdAt.getTime() + 15 * 60_000),
          },
        });
    }
    if (
      status !== IncidentStatus.NEW &&
      (await prisma.incidentAssignment.count({
        where: { incidentId: incident.id },
      })) === 0
    )
      await prisma.incidentAssignment.create({
        data: {
          incidentId: incident.id,
          technicianId: technician.id,
          assignedById: manager.id,
          assignedAt: new Date(createdAt.getTime() + 10 * 60_000),
        },
      });
    if (completed)
      await prisma.incidentRating.upsert({
        where: { incidentId: incident.id },
        update: { rating: 4 },
        create: {
          incidentId: incident.id,
          reporterId: reporter.id,
          rating: 4,
          comment: "Xử lý nhanh, thiết bị hoạt động ổn định.",
        },
      });
  }

  const planSpecs = [
    [
      assets[0],
      "Kiểm tra máy chiếu mỗi học kỳ",
      RecurrenceType.QUARTERLY,
      technicians[0],
    ],
    [
      assets[2],
      "Vệ sinh điều hòa định kỳ",
      RecurrenceType.QUARTERLY,
      technicians[0],
    ],
    [
      assets[4],
      "Kiểm tra thiết bị mạng hàng tháng",
      RecurrenceType.MONTHLY,
      technicians[1],
    ],
  ] as const;
  for (let index = 0; index < planSpecs.length; index++) {
    const [asset, name, recurrenceType, technician] = planSpecs[index];
    const planId = `demo-plan-${index + 1}`;
    const dueAt = hoursFromNow((index + 1) * 48);
    const plan = await prisma.maintenancePlan.upsert({
      where: { id: planId },
      update: {
        assetId: asset.id,
        name,
        recurrenceType,
        nextDueAt: dueAt,
        assignedTechnicianId: technician.id,
      },
      create: {
        id: planId,
        assetId: asset.id,
        name,
        recurrenceType,
        startDate: dueAt,
        nextDueAt: dueAt,
        assignedTechnicianId: technician.id,
        checklist: [
          "Kiểm tra nguồn điện",
          "Vệ sinh thiết bị",
          "Chạy thử chức năng",
        ],
        createdById: manager.id,
      },
    });
    await prisma.maintenanceTask.upsert({
      where: { planId_dueAt: { planId: plan.id, dueAt } },
      update: {},
      create: {
        planId: plan.id,
        assetId: asset.id,
        technicianId: technician.id,
        dueAt,
        status: MaintenanceTaskStatus.PENDING,
      },
    });
  }

  const partSpecs = [
    ["HDMI-2M", "Cáp HDMI 2 mét", "Cáp kết nối", "sợi", 12, 3, 150000],
    ["MOUSE-USB", "Chuột USB", "Thiết bị ngoại vi", "cái", 15, 5, 120000],
    ["KEYBOARD-USB", "Bàn phím USB", "Thiết bị ngoại vi", "cái", 8, 3, 180000],
    [
      "RAM-DDR4-8G",
      "RAM DDR4 8GB",
      "Linh kiện máy tính",
      "thanh",
      5,
      2,
      650000,
    ],
    ["SSD-256G", "SSD 256GB", "Linh kiện máy tính", "ổ", 4, 2, 750000],
    ["PRINTER-INK", "Mực máy in", "Vật tư máy in", "hộp", 6, 2, 900000],
    ["RJ45-CAT6", "Đầu mạng RJ45 Cat6", "Thiết bị mạng", "cái", 40, 10, 5000],
    ["AC-FILTER", "Lưới lọc điều hòa", "Điều hòa", "tấm", 3, 2, 300000],
  ] as const;
  for (const [
    partCode,
    name,
    category,
    unit,
    quantity,
    minimumQuantity,
    unitPrice,
  ] of partSpecs) {
    const part = await prisma.part.upsert({
      where: { partCode },
      update: {
        name,
        category,
        unit,
        quantity,
        minimumQuantity,
        unitPrice,
        active: true,
      },
      create: {
        partCode,
        name,
        category,
        unit,
        quantity,
        minimumQuantity,
        unitPrice,
      },
    });
    if (
      (await prisma.stockTransaction.count({ where: { partId: part.id } })) ===
      0
    )
      await prisma.stockTransaction.create({
        data: {
          partId: part.id,
          type: StockTransactionType.STOCK_IN,
          quantity,
          unitPrice,
          actorId: manager.id,
          note: "Tồn kho đầu kỳ - dữ liệu demo",
        },
      });
  }

  if (
    (await prisma.notification.count({
      where: {
        userId: technicians[0].id,
        message: { contains: "Dữ liệu demo" },
      },
    })) === 0
  )
    await prisma.notification.create({
      data: {
        userId: technicians[0].id,
        type: NotificationType.INCIDENT_ASSIGNED,
        title: "Công việc demo",
        message: "Dữ liệu demo: bạn có phiếu sự cố được phân công",
        entityType: "Incident",
        entityId: incidentIds[1],
      },
    });
  if ((await prisma.auditLog.count({ where: { action: "SEED_DEMO" } })) === 0)
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "SEED_DEMO",
        entityType: "System",
        entityId: "demo",
        afterData: {
          users: users.length,
          assets: assets.length,
          incidents: incidentIds.length,
        },
      },
    });

  console.log(
    `Seeded ${users.length} users, ${rooms.length} rooms, ${assets.length} assets, ${incidentIds.length} incidents, ${planSpecs.length} maintenance plans and ${partSpecs.length} parts.`,
  );
}

main().finally(() => prisma.$disconnect());
