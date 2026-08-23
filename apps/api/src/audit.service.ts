import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId: string,
    beforeData?: unknown,
    afterData?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        beforeData: beforeData as Prisma.InputJsonValue | undefined,
        afterData: afterData as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
