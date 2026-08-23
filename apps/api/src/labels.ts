import { IncidentStatus } from "@prisma/client";

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  [IncidentStatus.NEW]: "Mới tiếp nhận",
  [IncidentStatus.ASSIGNED]: "Đã phân công",
  [IncidentStatus.IN_PROGRESS]: "Đang xử lý",
  [IncidentStatus.WAITING_FOR_PARTS]: "Chờ vật tư",
  [IncidentStatus.AWAITING_CONFIRMATION]: "Chờ xác nhận",
  [IncidentStatus.COMPLETED]: "Hoàn tất",
  [IncidentStatus.CANCELLED]: "Đã hủy",
  [IncidentStatus.REOPENED]: "Đã mở lại",
};
