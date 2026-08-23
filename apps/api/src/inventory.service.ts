import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { NotificationType, Role, StockTransactionType } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import {
  CreatePartDto,
  CreateStockTransactionDto,
  UpdatePartDto,
} from "./inventory.dto";

type CurrentUser = { sub: string; role: Role };

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private manager(user: CurrentUser) {
    if (user.role !== Role.ADMIN && user.role !== Role.FACILITY_MANAGER)
      throw new ForbiddenException("Chỉ quản lý được cập nhật kho");
  }
  listParts() {
    return this.prisma.part.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }
  getPart(id: string) {
    return this.prisma.part.findUniqueOrThrow({
      where: { id },
      include: {
        transactions: {
          take: 30,
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { fullName: true } } },
        },
      },
    });
  }

  async createPart(user: CurrentUser, body: CreatePartDto) {
    this.manager(user);
    const part = await this.prisma.part.create({
      data: { ...body, partCode: body.partCode.toUpperCase() },
    });
    await this.audit.record(
      user.sub,
      "CREATE",
      "Part",
      part.id,
      undefined,
      part,
    );
    return part;
  }

  async updatePart(user: CurrentUser, id: string, body: UpdatePartDto) {
    this.manager(user);
    const before = await this.prisma.part.findUniqueOrThrow({ where: { id } });
    const part = await this.prisma.part.update({ where: { id }, data: body });
    await this.audit.record(user.sub, "UPDATE", "Part", id, before, part);
    return part;
  }

  listTransactions() {
    return this.prisma.stockTransaction.findMany({
      take: 500,
      include: {
        part: true,
        actor: { select: { fullName: true } },
        incident: { select: { incidentCode: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async transact(user: CurrentUser, body: CreateStockTransactionDto) {
    this.manager(user);
    if (body.quantity <= 0 && body.type !== StockTransactionType.ADJUSTMENT)
      throw new BadRequestException("Số lượng phải lớn hơn 0");
    const part = await this.prisma.part.findUniqueOrThrow({
      where: { id: body.partId },
    });
    const nextQuantity =
      body.type === StockTransactionType.STOCK_IN
        ? part.quantity + body.quantity
        : body.type === StockTransactionType.STOCK_OUT
          ? part.quantity - body.quantity
          : body.quantity;
    if (nextQuantity < 0)
      throw new BadRequestException(
        `Không đủ tồn kho. Hiện còn ${part.quantity} ${part.unit}`,
      );
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.part.update({
        where: { id: part.id },
        data: {
          quantity: nextQuantity,
          ...(body.unitPrice !== undefined
            ? { unitPrice: body.unitPrice }
            : {}),
        },
      });
      const transaction = await tx.stockTransaction.create({
        data: {
          partId: part.id,
          type: body.type,
          quantity: body.quantity,
          unitPrice: body.unitPrice,
          incidentId: body.incidentId,
          actorId: user.sub,
          note: body.note,
        },
      });
      if (body.type === StockTransactionType.STOCK_OUT && body.incidentId)
        await tx.incidentPart.create({
          data: {
            incidentId: body.incidentId,
            partId: part.id,
            quantity: body.quantity,
            unitPriceSnapshot: body.unitPrice ?? part.unitPrice,
          },
        });
      if (updated.quantity <= updated.minimumQuantity) {
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
              type: NotificationType.LOW_STOCK,
              title: "Linh kiện sắp hết",
              message: `${updated.name} còn ${updated.quantity} ${updated.unit}`,
              entityType: "Part",
              entityId: updated.id,
            })),
          });
      }
      return { part: updated, transaction };
    });
    await this.audit.record(
      user.sub,
      body.type,
      "Part",
      part.id,
      { quantity: part.quantity },
      { quantity: result.part.quantity },
    );
    return result;
  }
}
