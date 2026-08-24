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

export function missingChecklistReasons(
  required: string[],
  result: Array<{ item: string; completed: boolean; note?: string }>,
) {
  return required.filter((item) => {
    const entry = result.find((candidate) => candidate.item === item);
    return !entry || (!entry.completed && !entry.note?.trim());
  });
}
