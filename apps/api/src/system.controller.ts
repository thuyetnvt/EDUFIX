import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Priority, Role } from "@prisma/client";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { UpdatePriorityTargetDto } from "./system.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/v1/notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() req: any) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Patch(":id/read")
  read(@Req() req: any, @Param("id") id: string) {
    return this.prisma.notification.update({
      where: { id, userId: req.user.sub },
      data: { readAt: new Date() },
    });
  }

  @Post("read-all")
  async readAll(@Req() req: any) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: req.user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, count: result.count };
  }
}

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("api/v1/priority-targets")
export class PriorityTargetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.priorityTarget.findMany({
      orderBy: { resolutionMinutes: "asc" },
    });
  }

  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Patch(":priority")
  async update(
    @Req() req: any,
    @Param("priority") priority: Priority,
    @Body() body: UpdatePriorityTargetDto,
  ) {
    const updated = await this.prisma.priorityTarget.upsert({
      where: { priority },
      update: { ...body, updatedById: req.user.sub },
      create: { priority, ...body, updatedById: req.user.sub },
    });
    await this.audit.record(
      req.user.sub,
      "UPDATE",
      "PriorityTarget",
      updated.id,
      undefined,
      updated,
    );
    return updated;
  }
}

@ApiTags("audit")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller("api/v1/audit-logs")
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.auditLog.findMany({
      take: 200,
      include: { actor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
