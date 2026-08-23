import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  IncidentStatus,
  NotificationType,
  Prisma,
  Priority,
  Role,
} from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AiService } from "./ai.service";
import { AuditService } from "./audit.service";
import { syncAssetStatus } from "./asset-status";
import { canTransition } from "./incident-flow";
import {
  AddCommentDto,
  AssignIncidentDto,
  ConfirmResolutionDto,
  CreateIncidentDto,
  IncidentQueryDto,
  RatingDto,
  RepairResultDto,
  TransitionIncidentDto,
} from "./incidents.dto";

type CurrentUser = { sub: string; role: Role };

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly audit: AuditService,
  ) {}

  private accessWhere(user: CurrentUser): Prisma.IncidentWhereInput {
    if (user.role === Role.ADMIN || user.role === Role.FACILITY_MANAGER)
      return {};
    if (user.role === Role.TECHNICIAN)
      return { assignedTechnicianId: user.sub };
    return { reporterId: user.sub };
  }

  private async ensureAccess(id: string, user: CurrentUser) {
    const incident = await this.prisma.incident.findUniqueOrThrow({
      where: { id },
    });
    const allowed =
      user.role === Role.ADMIN ||
      user.role === Role.FACILITY_MANAGER ||
      incident.reporterId === user.sub ||
      incident.assignedTechnicianId === user.sub;
    if (!allowed)
      throw new ForbiddenException("Bạn không được truy cập phiếu này");
    return incident;
  }

  async list(user: CurrentUser, query: IncidentQueryDto) {
    const where: Prisma.IncidentWhereInput = {
      ...this.accessWhere(user),
      ...(query.q
        ? {
            OR: [
              { incidentCode: { contains: query.q, mode: "insensitive" } },
              { title: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.technicianId &&
      (user.role === Role.ADMIN || user.role === Role.FACILITY_MANAGER)
        ? { assignedTechnicianId: query.technicianId }
        : {}),
      ...(query.overdue
        ? {
            dueAt: { lt: new Date() },
            status: {
              notIn: [IncidentStatus.COMPLETED, IncidentStatus.CANCELLED],
            },
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.incident.findMany({
        where,
        include: {
          asset: { include: { location: true, category: true } },
          reporter: { select: { fullName: true } },
          assignedTechnician: { select: { fullName: true } },
          _count: { select: { comments: true, attachments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.incident.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async detail(id: string, user: CurrentUser) {
    await this.ensureAccess(id, user);
    return this.prisma.incident.findUniqueOrThrow({
      where: { id },
      include: {
        asset: { include: { location: true, category: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
        assignedTechnician: {
          select: { id: true, fullName: true, email: true },
        },
        assignments: {
          include: {
            technician: { select: { fullName: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
        history: {
          include: { actor: { select: { fullName: true } } },
          orderBy: { createdAt: "asc" },
        },
        comments: {
          where:
            user.role === Role.REPORTER ? { internalOnly: false } : undefined,
          include: {
            author: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: true,
        rating: true,
        parts: { include: { part: true } },
      },
    });
  }

  private async dueAt(priority: Priority) {
    const target = await this.prisma.priorityTarget.findUnique({
      where: { priority },
    });
    const fallback = { URGENT: 120, HIGH: 240, MEDIUM: 1440, LOW: 4320 }[
      priority
    ];
    return new Date(
      Date.now() + (target?.resolutionMinutes ?? fallback) * 60_000,
    );
  }

  async create(user: CurrentUser, body: CreateIncidentDto) {
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id: body.assetId },
    });
    const suggestion = await this.ai.classify(
      body.title,
      body.description,
      asset.categoryId,
      asset.locationId,
    );
    const possibleDuplicates = await this.ai.findDuplicates(
      asset.id,
      body.title,
      body.description,
    );
    const priority = body.priority ?? suggestion.suggestedPriority;
    const incidentCode = `INC-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const created = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          incidentCode,
          assetId: asset.id,
          reporterId: user.sub,
          title: body.title,
          description: body.description,
          category: suggestion.category,
          priority,
          dueAt: await this.dueAt(priority),
          aiSuggestion: suggestion,
          history: {
            create: {
              actorId: user.sub,
              toStatus: IncidentStatus.NEW,
              note: "Tạo phiếu sự cố",
            },
          },
        },
        include: { asset: { include: { location: true } } },
      });
      await syncAssetStatus(tx, asset.id);
      const managers = await tx.user.findMany({
        where: {
          role: { in: [Role.ADMIN, Role.FACILITY_MANAGER] },
          active: true,
        },
        select: { id: true },
      });
      if (managers.length)
        await tx.notification.createMany({
          data: managers.map((manager) => ({
            userId: manager.id,
            type: NotificationType.INCIDENT_CREATED,
            title: "Phiếu sự cố mới",
            message: `${incident.incidentCode}: ${incident.title}`,
            entityType: "Incident",
            entityId: incident.id,
          })),
        });
      return incident;
    });
    await this.audit.record(
      user.sub,
      "CREATE",
      "Incident",
      created.id,
      undefined,
      created,
    );
    return { ...created, aiSuggestion: suggestion, possibleDuplicates };
  }

  async assign(id: string, user: CurrentUser, body: AssignIncidentDto) {
    if (user.role !== Role.ADMIN && user.role !== Role.FACILITY_MANAGER)
      throw new ForbiddenException("Bạn không có quyền phân công");
    const incident = await this.prisma.incident.findUniqueOrThrow({
      where: { id },
    });
    const technician = await this.prisma.user.findFirst({
      where: { id: body.technicianId, role: Role.TECHNICIAN, active: true },
    });
    if (!technician)
      throw new BadRequestException("Kỹ thuật viên không hợp lệ");
    if (
      incident.status !== IncidentStatus.NEW &&
      incident.status !== IncidentStatus.REOPENED &&
      incident.status !== IncidentStatus.ASSIGNED
    )
      throw new BadRequestException(
        "Phiếu không ở trạng thái có thể phân công",
      );
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.incidentAssignment.updateMany({
        where: { incidentId: id, unassignedAt: null },
        data: { unassignedAt: new Date() },
      });
      await tx.incidentAssignment.create({
        data: {
          incidentId: id,
          technicianId: technician.id,
          assignedById: user.sub,
          note: body.note,
        },
      });
      const next = await tx.incident.update({
        where: { id },
        data: {
          assignedTechnicianId: technician.id,
          status: IncidentStatus.ASSIGNED,
        },
      });
      if (incident.status !== IncidentStatus.ASSIGNED)
        await tx.incidentStatusHistory.create({
          data: {
            incidentId: id,
            actorId: user.sub,
            fromStatus: incident.status,
            toStatus: IncidentStatus.ASSIGNED,
            note: body.note ?? "Phân công kỹ thuật viên",
          },
        });
      await tx.notification.create({
        data: {
          userId: technician.id,
          type: NotificationType.INCIDENT_ASSIGNED,
          title: "Công việc mới",
          message: `Bạn được giao xử lý ${incident.incidentCode}`,
          entityType: "Incident",
          entityId: id,
        },
      });
      return next;
    });
    await this.audit.record(
      user.sub,
      "ASSIGN",
      "Incident",
      id,
      { technicianId: incident.assignedTechnicianId },
      { technicianId: technician.id },
    );
    return updated;
  }

  async transition(id: string, user: CurrentUser, body: TransitionIncidentDto) {
    const incident = await this.ensureAccess(id, user);
    if (!canTransition(incident.status, body.status))
      throw new BadRequestException(
        `Không thể chuyển từ ${incident.status} sang ${body.status}`,
      );
    if (user.role === Role.REPORTER)
      throw new ForbiddenException(
        "Người báo chỉ có thể xác nhận hoặc mở lại phiếu",
      );
    if (
      user.role === Role.TECHNICIAN &&
      incident.assignedTechnicianId !== user.sub
    )
      throw new ForbiddenException("Phiếu chưa được giao cho bạn");
    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.IncidentUpdateInput = { status: body.status };
      if (
        body.status === IncidentStatus.IN_PROGRESS &&
        !incident.firstRespondedAt
      )
        data.firstRespondedAt = new Date();
      if (body.status === IncidentStatus.AWAITING_CONFIRMATION)
        data.resolvedAt = new Date();
      const next = await tx.incident.update({ where: { id }, data });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: id,
          actorId: user.sub,
          fromStatus: incident.status,
          toStatus: body.status,
          note: body.note,
        },
      });
      await tx.notification.create({
        data: {
          userId: incident.reporterId,
          type: NotificationType.INCIDENT_UPDATED,
          title: "Phiếu được cập nhật",
          message: `${incident.incidentCode} chuyển sang ${body.status}`,
          entityType: "Incident",
          entityId: id,
        },
      });
      await syncAssetStatus(tx, incident.assetId);
      return next;
    });
    await this.audit.record(
      user.sub,
      "TRANSITION",
      "Incident",
      id,
      { status: incident.status },
      { status: updated.status, note: body.note },
    );
    return updated;
  }

  async comment(id: string, user: CurrentUser, body: AddCommentDto) {
    const incident = await this.ensureAccess(id, user);
    if (body.internalOnly && user.role === Role.REPORTER)
      throw new ForbiddenException("Người báo không thể tạo ghi chú nội bộ");
    const comment = await this.prisma.incidentComment.create({
      data: {
        incidentId: id,
        authorId: user.sub,
        content: body.content,
        internalOnly: body.internalOnly,
      },
      include: { author: { select: { fullName: true, role: true } } },
    });
    const targetIds = new Set(
      [incident.reporterId, incident.assignedTechnicianId].filter(
        Boolean,
      ) as string[],
    );
    targetIds.delete(user.sub);
    if (targetIds.size)
      await this.prisma.notification.createMany({
        data: [...targetIds].map((userId) => ({
          userId,
          type: NotificationType.COMMENT_ADDED,
          title: "Bình luận mới",
          message: `${incident.incidentCode} có bình luận mới`,
          entityType: "Incident",
          entityId: id,
        })),
      });
    return comment;
  }

  async repairResult(id: string, user: CurrentUser, body: RepairResultDto) {
    const incident = await this.ensureAccess(id, user);
    if (
      user.role === Role.REPORTER ||
      (user.role === Role.TECHNICIAN &&
        incident.assignedTechnicianId !== user.sub)
    )
      throw new ForbiddenException("Bạn không thể cập nhật kết quả sửa chữa");
    if (
      incident.status !== IncidentStatus.IN_PROGRESS &&
      incident.status !== IncidentStatus.WAITING_FOR_PARTS
    )
      throw new BadRequestException("Phiếu chưa ở trạng thái sửa chữa");
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.incident.update({
        where: { id },
        data: {
          rootCause: body.rootCause,
          resolution: body.resolution,
          laborCost: body.laborCost,
          externalCost: body.externalCost,
          status: IncidentStatus.AWAITING_CONFIRMATION,
          resolvedAt: new Date(),
        },
      });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: id,
          actorId: user.sub,
          fromStatus: incident.status,
          toStatus: IncidentStatus.AWAITING_CONFIRMATION,
          note: "Đã gửi kết quả sửa chữa",
        },
      });
      await tx.notification.create({
        data: {
          userId: incident.reporterId,
          type: NotificationType.INCIDENT_UPDATED,
          title: "Vui lòng xác nhận kết quả",
          message: `${incident.incidentCode} đã được kỹ thuật viên xử lý`,
          entityType: "Incident",
          entityId: id,
        },
      });
      return next;
    });
    await this.audit.record(
      user.sub,
      "REPAIR_RESULT",
      "Incident",
      id,
      { status: incident.status },
      {
        status: updated.status,
        laborCost: updated.laborCost,
        externalCost: updated.externalCost,
      },
    );
    return updated;
  }

  async confirm(id: string, user: CurrentUser, body: ConfirmResolutionDto) {
    const incident = await this.prisma.incident.findUniqueOrThrow({
      where: { id },
    });
    if (incident.reporterId !== user.sub)
      throw new ForbiddenException("Chỉ người báo mới được xác nhận kết quả");
    if (incident.status !== IncidentStatus.AWAITING_CONFIRMATION)
      throw new BadRequestException("Phiếu chưa chờ xác nhận");
    if (!body.resolved && !body.reason?.trim())
      throw new BadRequestException("Cần nhập lý do khi sự cố chưa được xử lý");
    const target = body.resolved
      ? IncidentStatus.COMPLETED
      : IncidentStatus.REOPENED;
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.incident.update({
        where: { id },
        data: {
          status: target,
          completedAt: body.resolved ? new Date() : null,
        },
      });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: id,
          actorId: user.sub,
          fromStatus: incident.status,
          toStatus: target,
          note: body.reason,
        },
      });
      await syncAssetStatus(tx, incident.assetId);
      return next;
    });
    await this.audit.record(
      user.sub,
      body.resolved ? "CONFIRM" : "REOPEN",
      "Incident",
      id,
      { status: incident.status },
      { status: updated.status, reason: body.reason },
    );
    return updated;
  }

  async rate(id: string, user: CurrentUser, body: RatingDto) {
    const incident = await this.prisma.incident.findUniqueOrThrow({
      where: { id },
    });
    if (
      incident.reporterId !== user.sub ||
      incident.status !== IncidentStatus.COMPLETED
    )
      throw new ForbiddenException(
        "Chỉ người báo được đánh giá phiếu đã hoàn thành",
      );
    const rating = await this.prisma.incidentRating.upsert({
      where: { incidentId: id },
      update: { rating: body.rating, comment: body.comment },
      create: {
        incidentId: id,
        reporterId: user.sub,
        rating: body.rating,
        comment: body.comment,
      },
    });
    await this.audit.record(user.sub, "RATE", "Incident", id, undefined, {
      rating: rating.rating,
    });
    return rating;
  }
}
