import { RecurrenceType } from "@prisma/client";

export function nextMaintenanceDate(
  date: Date,
  recurrence: RecurrenceType,
  interval: number,
) {
  const next = new Date(date);
  if (recurrence === RecurrenceType.WEEKLY)
    next.setDate(next.getDate() + 7 * interval);
  if (recurrence === RecurrenceType.MONTHLY)
    next.setMonth(next.getMonth() + interval);
  if (recurrence === RecurrenceType.QUARTERLY)
    next.setMonth(next.getMonth() + 3 * interval);
  if (recurrence === RecurrenceType.YEARLY)
    next.setFullYear(next.getFullYear() + interval);
  return next;
}
