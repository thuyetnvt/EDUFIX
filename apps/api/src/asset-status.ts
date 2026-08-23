import {
  AssetStatus,
  IncidentStatus,
  MaintenanceTaskStatus,
  Prisma,
} from "@prisma/client";

const OPEN_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.NEW,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.WAITING_FOR_PARTS,
  IncidentStatus.AWAITING_CONFIRMATION,
  IncidentStatus.REOPENED,
];

const REPAIRING_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.IN_PROGRESS,
  IncidentStatus.WAITING_FOR_PARTS,
  IncidentStatus.AWAITING_CONFIRMATION,
];

/**
 * Derives an asset status from every active incident and maintenance task.
 * This must be called inside the same transaction as the state change that
 * triggered the recalculation.
 */
export async function syncAssetStatus(
  tx: Prisma.TransactionClient,
  assetId: string,
) {
  const asset = await tx.asset.findUnique({
    where: { id: assetId },
    select: { status: true },
  });
  if (!asset || asset.status === AssetStatus.RETIRED) return asset?.status;

  const [incidents, tasks] = await Promise.all([
    tx.incident.findMany({
      where: { assetId, status: { in: OPEN_INCIDENT_STATUSES } },
      select: { status: true },
    }),
    tx.maintenanceTask.findMany({
      where: {
        assetId,
        status: {
          in: [
            MaintenanceTaskStatus.PENDING,
            MaintenanceTaskStatus.IN_PROGRESS,
          ],
        },
      },
      select: { status: true },
    }),
  ]);

  const nextStatus = incidents.some((incident) =>
    REPAIRING_INCIDENT_STATUSES.includes(incident.status),
  )
    ? AssetStatus.REPAIRING
    : incidents.length > 0
      ? AssetStatus.FAULTY
      : tasks.some(
          (task) => task.status === MaintenanceTaskStatus.IN_PROGRESS,
        )
        ? AssetStatus.MAINTENANCE
        : AssetStatus.ACTIVE;

  if (nextStatus !== asset.status)
    await tx.asset.update({ where: { id: assetId }, data: { status: nextStatus } });
  return nextStatus;
}
