import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  IncidentStatus,
  MaintenanceTaskStatus,
  NotificationType,
  Role,
} from "@prisma/client";
import { PrismaService } from "./prisma.service";

@Injectable()
export class ScheduledAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  private async notifyOnce(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType: string,
    entityId: string,
  ) {
    const recentlySent = await this.prisma.notification.findFirst({
      where: {
        userId,
        type,
        entityType,
        entityId,
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      },
    });
    if (!recentlySent) {
      await this.prisma.notification.create({
        data: { userId, type, title, message, entityType, entityId },
      });
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendSlaAndMaintenanceAlerts() {
    const now = new Date();
    const warningHorizon = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const maintenanceHorizon = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
    const [incidents, tasks, managers] = await Promise.all([
      this.prisma.incident.findMany({
        where: {
          dueAt: { lte: warningHorizon },
          status: {
            notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED],
          },
        },
        select: {
          id: true,
          incidentCode: true,
          dueAt: true,
          reporterId: true,
          assignedTechnicianId: true,
        },
      }),
      this.prisma.maintenanceTask.findMany({
        where: {
          status: MaintenanceTaskStatus.PENDING,
          dueAt: { lte: maintenanceHorizon },
        },
        include: {
          asset: { select: { name: true } },
          plan: { select: { name: true } },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: { in: [Role.ADMIN, Role.FACILITY_MANAGER] },
          active: true,
        },
        select: { id: true },
      }),
    ]);

    for (const incident of incidents) {
      const overdue = Boolean(incident.dueAt && incident.dueAt < now);
      const type = overdue
        ? NotificationType.OVERDUE
        : NotificationType.DEADLINE_WARNING;
      const targets = new Set([
        incident.reporterId,
        incident.assignedTechnicianId,
        ...managers.map((manager) => manager.id),
      ]);
      targets.delete(null);
      for (const userId of targets as Set<string>) {
        await this.notifyOnce(
          userId,
          type,
          overdue ? "Phiếu đã quá hạn" : "Phiếu sắp đến hạn",
          `${incident.incidentCode} ${overdue ? "đã quá hạn xử lý" : "còn dưới 2 giờ để xử lý"}`,
          "Incident",
          incident.id,
        );
      }
    }

    for (const task of tasks) {
      const targets = new Set([
        task.technicianId,
        ...managers.map((manager) => manager.id),
      ]);
      targets.delete(null);
      for (const userId of targets as Set<string>) {
        await this.notifyOnce(
          userId,
          NotificationType.MAINTENANCE_DUE,
          "Bảo trì sắp đến hạn",
          `${task.plan.name} cho ${task.asset.name}`,
          "MaintenanceTask",
          task.id,
        );
      }
    }
  }
}
