import { IncidentStatus } from "@prisma/client";

export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: [IncidentStatus.ASSIGNED, IncidentStatus.CANCELLED],
  ASSIGNED: [IncidentStatus.IN_PROGRESS, IncidentStatus.CANCELLED],
  IN_PROGRESS: [
    IncidentStatus.WAITING_FOR_PARTS,
    IncidentStatus.AWAITING_CONFIRMATION,
    IncidentStatus.CANCELLED,
  ],
  WAITING_FOR_PARTS: [IncidentStatus.IN_PROGRESS, IncidentStatus.CANCELLED],
  AWAITING_CONFIRMATION: [IncidentStatus.COMPLETED, IncidentStatus.REOPENED],
  REOPENED: [IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus) {
  return INCIDENT_TRANSITIONS[from].includes(to);
}
