import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  MaintenanceTaskStatus,
  RecurrenceType,
  Role,
} from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { syncAssetStatus } from "./asset-status";
import { nextMaintenanceDate } from "./maintenance-flow";
import {
  CompleteMaintenanceTaskDto,
  CreateMaintenancePlanDto,
  UpdateMaintenancePlanDto,
} from "./maintenance.dto";

type CurrentUser = { sub: string; role: Role };

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private assertTaskAccess(user: CurrentUser) {
    if (user.role === Role.REPORTER)
      throw new ForbiddenException(
        "Người báo không có quyền truy cập công việc bảo trì",
      );
  }

  async create(user: CurrentUser, body: CreateMaintenancePlanDto) {
    if (user.role !== Role.ADMIN && user.role !== Role.FACILITY_MANAGER)
      throw new ForbiddenException();
    const startDate = new Date(body.startDate);
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        assetId: body.assetId,
        name: body.name,
        description: body.description,
        recurrenceType: body.recurrenceType,
        interval: body.interval,
        startDate,
        nextDueAt: startDate,
        assignedTechnicianId: body.assignedTechnicianId,
        checklist: body.checklist,
        createdById: user.sub,
      },
      include: {
        asset: true,
        assignedTechnician: { select: { fullName: true } },
      },
    });
    await this.generateForPlan(plan.id);
    await this.audit.record(
      user.sub,
      "CREATE",
      "MaintenancePlan",
      plan.id,
      undefined,
      plan,
    );
    return plan;
  }

  update(user: CurrentUser, id: string, body: UpdateMaintenancePlanDto) {
    if (user.role !== Role.ADMIN && user.role !== Role.FACILITY_MANAGER)
      throw new ForbiddenException();
    return this.prisma.maintenancePlan.update({
      where: { id },
      data: body,
      include: {
        asset: true,
        assignedTechnician: { select: { fullName: true } },
      },
    });
  }

  async generateForPlan(planId: string) {
    const plan = await this.prisma.maintenancePlan.findUniqueOrThrow({
      where: { id: planId },
    });
    if (!plan.active) return null;
    return this.prisma.maintenanceTask.upsert({
      where: { planId_dueAt: { planId, dueAt: plan.nextDueAt } },
      update: {},
      create: {
        planId,
        assetId: plan.assetId,
        technicianId: plan.assignedTechnicianId,
        dueAt: plan.nextDueAt,
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateDueTasks() {
    const horizon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const plans = await this.prisma.maintenancePlan.findMany({
      where: { active: true, nextDueAt: { lte: horizon } },
    });
    for (const plan of plans) await this.generateForPlan(plan.id);
  }

  listPlans(user: CurrentUser) {
    this.assertTaskAccess(user);
    return this.prisma.maintenancePlan.findMany({
      include: {
        asset: { include: { location: true } },
        assignedTechnician: { select: { id: true, fullName: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { nextDueAt: "asc" },
    });
  }

  async getPlan(user: CurrentUser, id: string) {
    this.assertTaskAccess(user);
    const plan = await this.prisma.maintenancePlan.findUnique({
      where: { id },
      include: {
        asset: { include: { location: true } },
        assignedTechnician: { select: { id: true, fullName: true } },
        tasks: { orderBy: { dueAt: "desc" } },
      },
    });
    if (!plan) throw new NotFoundException("Không tìm thấy kế hoạch bảo trì");
    return plan;
  }

  listTasks(user: CurrentUser) {
    this.assertTaskAccess(user);
    return this.prisma.maintenanceTask.findMany({
      where: user.role === Role.TECHNICIAN ? { technicianId: user.sub } : {},
      include: {
        asset: { include: { location: true } },
        plan: true,
        technician: { select: { fullName: true } },
      },
      orderBy: { dueAt: "asc" },
    });
  }

  async getTask(user: CurrentUser, id: string) {
    this.assertTaskAccess(user);
    const task = await this.prisma.maintenanceTask.findUnique({
      where: { id },
      include: {
        asset: { include: { location: true } },
        plan: true,
        technician: { select: { fullName: true } },
      },
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc bảo trì");
    if (user.role === Role.TECHNICIAN && task.technicianId !== user.sub)
      throw new ForbiddenException("Công việc chưa được giao cho bạn");
    return task;
  }

  async start(user: CurrentUser, id: string) {
    this.assertTaskAccess(user);
    const task = await this.prisma.maintenanceTask.findUniqueOrThrow({
      where: { id },
    });
    if (user.role === Role.TECHNICIAN && task.technicianId !== user.sub)
      throw new ForbiddenException("Công việc chưa được giao cho bạn");
    if (task.status !== MaintenanceTaskStatus.PENDING)
      throw new BadRequestException("Công việc không ở trạng thái chờ");
    return this.prisma.$transaction(async (tx) => {
      const started = await tx.maintenanceTask.update({
        where: { id },
        data: { status: MaintenanceTaskStatus.IN_PROGRESS },
      });
      await syncAssetStatus(tx, task.assetId);
      return started;
    });
  }

  async complete(
    user: CurrentUser,
    id: string,
    body: CompleteMaintenanceTaskDto,
  ) {
    this.assertTaskAccess(user);
    const task = await this.prisma.maintenanceTask.findUniqueOrThrow({
      where: { id },
      include: { plan: true },
    });
    if (user.role === Role.TECHNICIAN && task.technicianId !== user.sub)
      throw new ForbiddenException("Công việc chưa được giao cho bạn");
    if (task.status !== MaintenanceTaskStatus.IN_PROGRESS)
      throw new BadRequestException("Công việc chưa được bắt đầu");
    const result = await this.prisma.$transaction(async (tx) => {
      const completed = await tx.maintenanceTask.update({
        where: { id },
        data: {
          status: MaintenanceTaskStatus.COMPLETED,
          completedAt: new Date(),
          checklistResult: body.checklistResult,
          note: body.note,
        },
      });
      await syncAssetStatus(tx, task.assetId);
      if (task.plan.recurrenceType === RecurrenceType.ONE_TIME)
        await tx.maintenancePlan.update({
          where: { id: task.planId },
          data: { active: false },
        });
      else {
        const nextDueAt = nextMaintenanceDate(
          task.dueAt,
          task.plan.recurrenceType,
          task.plan.interval,
        );
        await tx.maintenancePlan.update({
          where: { id: task.planId },
          data: { nextDueAt },
        });
        await tx.maintenanceTask.upsert({
          where: { planId_dueAt: { planId: task.planId, dueAt: nextDueAt } },
          update: {},
          create: {
            planId: task.planId,
            assetId: task.assetId,
            technicianId: task.plan.assignedTechnicianId,
            dueAt: nextDueAt,
          },
        });
      }
      return completed;
    });
    await this.audit.record(
      user.sub,
      "COMPLETE",
      "MaintenanceTask",
      id,
      undefined,
      result,
    );
    return result;
  }
}
