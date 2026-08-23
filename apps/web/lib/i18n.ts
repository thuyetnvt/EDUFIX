export type LabelKind =
  | "role"
  | "incidentStatus"
  | "priority"
  | "assetStatus"
  | "maintenanceStatus"
  | "stockType"
  | "recurrence"
  | "locationType"
  | "accountStatus"
  | "attachmentKind"
  | "auditAction"
  | "auditEntity"
  | "aiCategory"
  | "aiIssueType"
  | "notificationType";

const labels: Record<LabelKind, Record<string, string>> = {
  role: {
    ADMIN: "Quản trị viên",
    FACILITY_MANAGER: "Quản lý cơ sở vật chất",
    TECHNICIAN: "Kỹ thuật viên",
    REPORTER: "Người báo sự cố",
  },
  incidentStatus: {
    NEW: "Mới tiếp nhận",
    ASSIGNED: "Đã phân công",
    IN_PROGRESS: "Đang xử lý",
    WAITING_FOR_PARTS: "Chờ vật tư",
    AWAITING_CONFIRMATION: "Chờ xác nhận",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    REOPENED: "Đã mở lại",
  },
  priority: {
    URGENT: "Khẩn cấp",
    HIGH: "Cao",
    MEDIUM: "Trung bình",
    LOW: "Thấp",
  },
  assetStatus: {
    ACTIVE: "Hoạt động",
    FAULTY: "Đang hỏng",
    REPAIRING: "Đang sửa chữa",
    MAINTENANCE: "Đang bảo trì",
    RETIRED: "Ngừng sử dụng",
    LOW_STOCK: "Tồn kho thấp",
  },
  maintenanceStatus: {
    PENDING: "Chờ thực hiện",
    IN_PROGRESS: "Đang thực hiện",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
  },
  stockType: {
    STOCK_IN: "Nhập kho",
    STOCK_OUT: "Xuất kho",
    ADJUSTMENT: "Điều chỉnh tồn",
  },
  recurrence: {
    ONE_TIME: "Một lần",
    WEEKLY: "Hàng tuần",
    MONTHLY: "Hàng tháng",
    QUARTERLY: "Hàng quý",
    YEARLY: "Hàng năm",
  },
  locationType: {
    CAMPUS: "Cơ sở",
    BUILDING: "Tòa nhà",
    FLOOR: "Tầng",
    ROOM: "Phòng",
  },
  accountStatus: {
    ACTIVE: "Đang hoạt động",
    DISABLED: "Đã khóa",
  },
  attachmentKind: {
    INCIDENT: "Ảnh sự cố",
    BEFORE_REPAIR: "Ảnh trước sửa chữa",
    AFTER_REPAIR: "Ảnh sau sửa chữa",
    DOCUMENT: "Tài liệu",
    MAINTENANCE: "Ảnh bảo trì",
  },
  auditAction: {
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    ASSIGN: "Phân công",
    TRANSFER: "Điều chuyển",
    TRANSITION: "Đổi trạng thái",
    COMPLETE: "Hoàn tất",
    RATE: "Đánh giá",
    STATUS_CHANGE: "Đổi trạng thái tài khoản",
    CONFIRM: "Xác nhận",
    REOPEN: "Mở lại",
    REPAIR_RESULT: "Cập nhật kết quả sửa chữa",
  },
  auditEntity: {
    Incident: "Phiếu sự cố",
    Asset: "Thiết bị",
    User: "Người dùng",
    MaintenancePlan: "Kế hoạch bảo trì",
    MaintenanceTask: "Công việc bảo trì",
    Part: "Vật tư",
    PriorityTarget: "Mục tiêu SLA",
  },
  aiCategory: {
    PROJECTOR: "Máy chiếu",
    COMPUTER: "Máy tính",
    AIR_CONDITIONER: "Điều hòa",
    PRINTER: "Máy in",
    NETWORK: "Mạng",
    OTHER: "Khác",
  },
  aiIssueType: {
    NO_SIGNAL: "Không có tín hiệu",
    BOOT_FAILURE: "Không khởi động",
    PAPER_JAM: "Kẹt giấy",
    COOLING: "Không làm lạnh",
    UNSTABLE_CONNECTION: "Kết nối không ổn định",
    GENERAL: "Sự cố chung",
  },
  notificationType: {
    INCIDENT_CREATED: "Phiếu mới",
    INCIDENT_ASSIGNED: "Được phân công",
    INCIDENT_UPDATED: "Phiếu được cập nhật",
    COMMENT_ADDED: "Bình luận mới",
    DEADLINE_WARNING: "Sắp đến hạn",
    OVERDUE: "Đã quá hạn",
    MAINTENANCE_DUE: "Bảo trì đến hạn",
    LOW_STOCK: "Tồn kho thấp",
    SYSTEM: "Hệ thống",
  },
};

const genericLabels: Record<string, string> = {
  ...labels.incidentStatus,
  ...labels.priority,
  ...labels.assetStatus,
  ...labels.maintenanceStatus,
  ...labels.stockType,
  ...labels.recurrence,
  ...labels.locationType,
  ...labels.auditAction,
  ...labels.auditEntity,
};

export function vi(value?: string | null, kind?: LabelKind) {
  if (!value) return "—";
  return (
    labels[kind ?? "incidentStatus"]?.[value] ??
    genericLabels[value] ??
    value.replaceAll("_", " ")
  );
}

export const label = vi;
