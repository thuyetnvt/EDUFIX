import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { IncidentStatus, Role } from "@prisma/client";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { PrismaService } from "./prisma.service";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.FACILITY_MANAGER)
@Controller("api/v1/reports")
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("incidents")
  async incidents(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("format") format?: string,
    @Res({ passthrough: true }) response?: Response,
  ) {
    const rows = await this.prisma.incident.findMany({
      where: {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      include: {
        asset: { include: { location: true } },
        reporter: { select: { fullName: true } },
        assignedTechnician: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (format === "csv" && response) {
      response.type("text/csv; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        'attachment; filename="incidents.csv"',
      );
      return [
        "Mã phiếu,Tiêu đề,Thiết bị,Vị trí,Ưu tiên,Trạng thái,Người báo,Kỹ thuật viên,Ngày tạo",
        ...rows.map((row) =>
          [
            row.incidentCode,
            row.title,
            row.asset.name,
            row.asset.location.name,
            row.priority,
            row.status,
            row.reporter.fullName,
            row.assignedTechnician?.fullName,
            row.createdAt.toISOString(),
          ]
            .map(csvCell)
            .join(","),
        ),
      ].join("\n");
    }
    return rows;
  }

  @Get("costs")
  async costs(@Query("from") from?: string, @Query("to") to?: string) {
    const rows = await this.prisma.incident.findMany({
      where: {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
        OR: [{ laborCost: { not: null } }, { externalCost: { not: null } }],
      },
      include: { asset: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: rows,
      total: rows.reduce(
        (sum, row) =>
          sum + Number(row.laborCost ?? 0) + Number(row.externalCost ?? 0),
        0,
      ),
    };
  }

  @Get("technicians")
  async technicians() {
    const technicians = await this.prisma.user.findMany({
      where: { role: Role.TECHNICIAN },
      select: { id: true, fullName: true, active: true },
    });
    const incidents = await this.prisma.incident.findMany({
      where: { assignedTechnicianId: { not: null } },
      select: {
        assignedTechnicianId: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });
    return technicians.map((technician) => {
      const assigned = incidents.filter(
        (item) => item.assignedTechnicianId === technician.id,
      );
      const completed = assigned.filter(
        (item) => item.status === IncidentStatus.COMPLETED && item.completedAt,
      );
      return {
        ...technician,
        assigned: assigned.length,
        completed: completed.length,
        completionRate: assigned.length
          ? Math.round((completed.length / assigned.length) * 100)
          : 0,
        averageResolutionMinutes: completed.length
          ? Math.round(
              completed.reduce(
                (sum, item) =>
                  sum +
                  (item.completedAt!.getTime() - item.createdAt.getTime()) /
                    60_000,
                0,
              ) / completed.length,
            )
          : 0,
      };
    });
  }
}
