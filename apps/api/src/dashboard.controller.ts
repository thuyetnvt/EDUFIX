import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  AssetStatus,
  IncidentStatus,
  MaintenanceTaskStatus,
  Prisma,
  Role,
} from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.FACILITY_MANAGER)
@Controller("api/v1/dashboard")
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("summary")
  async summary() {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [
      assets,
      active,
      faulty,
      open,
      overdue,
      completed,
      incidents,
      priorities,
      recent,
      urgentOrOverdue,
      upcomingMaintenance,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { active: true } }),
      this.prisma.asset.count({
        where: { active: true, status: AssetStatus.ACTIVE },
      }),
      this.prisma.asset.count({
        where: {
          active: true,
          status: { in: [AssetStatus.FAULTY, AssetStatus.REPAIRING] },
        },
      }),
      this.prisma.incident.count({
        where: {
          status: {
            notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED],
          },
        },
      }),
      this.prisma.incident.count({
        where: {
          dueAt: { lt: new Date() },
          status: {
            notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED],
          },
        },
      }),
      this.prisma.incident.findMany({
        where: { completedAt: { not: null } },
        select: {
          createdAt: true,
          dueAt: true,
          completedAt: true,
          firstRespondedAt: true,
          laborCost: true,
          externalCost: true,
        },
      }),
      this.prisma.incident.groupBy({ by: ["status"], _count: true }),
      this.prisma.incident.groupBy({ by: ["priority"], _count: true }),
      this.prisma.incident.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          asset: true,
          assignedTechnician: { select: { fullName: true } },
        },
      }),
      this.prisma.incident.findMany({
        where: {
          status: { notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED] },
          OR: [
            { priority: { in: ["URGENT", "HIGH"] } },
            { dueAt: { lt: new Date() } },
          ],
        },
        take: 6,
        orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
        include: { asset: { select: { name: true, assetCode: true } } },
      }),
      this.prisma.maintenanceTask.findMany({
        where: {
          status: MaintenanceTaskStatus.PENDING,
          dueAt: { gte: new Date() },
        },
        take: 5,
        orderBy: { dueAt: "asc" },
        include: { asset: true, plan: true },
      }),
    ]);
    const avg = (values: number[]) =>
      values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
          )
        : 0;
    const completedThisMonth = completed.filter(
      (item) => item.completedAt && item.completedAt >= monthStart,
    );
    return {
      assets,
      active,
      faulty,
      open,
      overdue,
      onTimeCompletionRate: completed.length
        ? Math.round(
            (completed.filter(
              (item) =>
                item.completedAt &&
                (!item.dueAt || item.completedAt <= item.dueAt),
            ).length /
              completed.length) *
              100,
          )
        : 100,
      averageResponseMinutes: avg(
        completed
          .filter((item) => item.firstRespondedAt)
          .map((item) =>
            Math.round(
              (item.firstRespondedAt!.getTime() - item.createdAt.getTime()) /
                60_000,
            ),
          ),
      ),
      averageResolutionMinutes: avg(
        completed
          .filter((item) => item.completedAt)
          .map((item) =>
            Math.round(
              (item.completedAt!.getTime() - item.createdAt.getTime()) / 60_000,
            ),
          ),
      ),
      repairCostThisMonth: completedThisMonth
        .reduce(
          (sum, item) =>
            sum.add(item.laborCost ?? 0).add(item.externalCost ?? 0),
          new Prisma.Decimal(0),
        )
        .toNumber(),
      incidentsByStatus: incidents,
      incidentsByPriority: priorities,
      urgentOrOverdue,
      recent,
      upcomingMaintenance,
    };
  }

  @Get("incident-trend")
  async trend() {
    const start = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const rows = await this.prisma.incident.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true, status: true },
    });
    const days = new Map<
      string,
      { date: string; total: number; completed: number }
    >();
    for (let i = 0; i < 30; i++) {
      const date = new Date(start.getTime() + i * 86_400_000)
        .toISOString()
        .slice(0, 10);
      days.set(date, { date, total: 0, completed: 0 });
    }
    for (const row of rows) {
      const day = days.get(row.createdAt.toISOString().slice(0, 10));
      if (day) {
        day.total++;
        if (row.status === IncidentStatus.COMPLETED) day.completed++;
      }
    }
    return [...days.values()];
  }

  @Get("status-distribution")
  statusDistribution() {
    return this.prisma.incident.groupBy({ by: ["status"], _count: true });
  }

  @Get("top-failing-assets")
  async topFailingAssets() {
    const groups = await this.prisma.incident.groupBy({
      by: ["assetId"],
      _count: true,
      orderBy: { _count: { assetId: "desc" } },
      take: 5,
    });
    const assets = await this.prisma.asset.findMany({
      where: { id: { in: groups.map((group) => group.assetId) } },
      select: { id: true, assetCode: true, name: true, status: true },
    });
    return groups.map((group) => ({
      ...assets.find((asset) => asset.id === group.assetId),
      failureCount: group._count,
    }));
  }
}
