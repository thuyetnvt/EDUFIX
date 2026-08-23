import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomBytes } from "crypto";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import {
  AssetQueryDto,
  CreateAssetDto,
  CreateCategoryDto,
  TransferAssetDto,
  UpdateAssetDto,
} from "./assets.dto";
import { AuditService } from "./audit.service";
import QRCode from "qrcode";

@ApiTags("assets")
@Controller("api/v1")
export class AssetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async withQr<T extends { qrToken: string }>(asset: T) {
    const path = `/scan/${asset.qrToken}`;
    const webOrigin =
      process.env.PUBLIC_WEB_URL ??
      (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",")[0];
    const url = `${webOrigin.replace(/\/$/, "")}${path}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
    });
    return { ...asset, path, url, qrDataUrl };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("assets")
  async list(@Query() query: AssetQueryDto) {
    const where: Prisma.AssetWhereInput = {
      active: true,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { assetCode: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        include: {
          category: true,
          location: true,
          _count: { select: { incidents: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("assets/:id")
  get(@Param("id") id: string) {
    return this.prisma.asset.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        location: true,
        documents: true,
        transfers: {
          include: {
            fromLocation: true,
            toLocation: true,
            transferredBy: { select: { fullName: true } },
          },
          orderBy: { transferredAt: "desc" },
        },
      },
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Post("assets")
  async create(@Req() req: any, @Body() body: CreateAssetDto) {
    const created = await this.prisma.asset.create({
      data: {
        ...body,
        assetCode: body.assetCode.toUpperCase(),
        purchaseDate: body.purchaseDate
          ? new Date(body.purchaseDate)
          : undefined,
        warrantyUntil: body.warrantyUntil
          ? new Date(body.warrantyUntil)
          : undefined,
        qrToken: randomBytes(24).toString("base64url"),
      },
      include: { category: true, location: true },
    });
    await this.audit.record(
      req.user.sub,
      "CREATE",
      "Asset",
      created.id,
      undefined,
      created,
    );
    return created;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Patch("assets/:id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateAssetDto,
  ) {
    const before = await this.prisma.asset.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.asset.update({
      where: { id },
      data: body,
      include: { category: true, location: true },
    });
    await this.audit.record(
      req.user.sub,
      "UPDATE",
      "Asset",
      id,
      before,
      updated,
    );
    return updated;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Post("assets/:id/transfer")
  async transfer(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: TransferAssetDto,
  ) {
    const asset = await this.prisma.asset.findUniqueOrThrow({ where: { id } });
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: { id },
        data: { locationId: body.toLocationId },
        include: { category: true, location: true },
      });
      await tx.assetTransfer.create({
        data: {
          assetId: id,
          fromLocationId: asset.locationId,
          toLocationId: body.toLocationId,
          reason: body.reason,
          transferredById: req.user.sub,
        },
      });
      return updated;
    });
    await this.audit.record(
      req.user.sub,
      "TRANSFER",
      "Asset",
      id,
      asset,
      result,
    );
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("assets/:id/history")
  async history(@Param("id") id: string) {
    const [incidents, maintenance, transfers] = await Promise.all([
      this.prisma.incident.findMany({
        where: { assetId: id },
        include: {
          reporter: { select: { fullName: true } },
          assignedTechnician: { select: { fullName: true } },
          rating: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.maintenanceTask.findMany({
        where: { assetId: id },
        include: { plan: true, technician: { select: { fullName: true } } },
        orderBy: { dueAt: "desc" },
      }),
      this.prisma.assetTransfer.findMany({
        where: { assetId: id },
        include: {
          fromLocation: true,
          toLocation: true,
          transferredBy: { select: { fullName: true } },
        },
        orderBy: { transferredAt: "desc" },
      }),
    ]);
    return { incidents, maintenance, transfers };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("assets/:id/qr")
  async qr(@Param("id") id: string) {
    const asset = await this.prisma.asset.findUniqueOrThrow({
      where: { id },
      select: { id: true, assetCode: true, name: true, qrToken: true },
    });
    return this.withQr(asset);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Post("assets/:id/qr/regenerate")
  async regenerateQr(@Req() req: any, @Param("id") id: string) {
    const updated = await this.prisma.asset.update({
      where: { id },
      data: { qrToken: randomBytes(24).toString("base64url") },
      select: { id: true, assetCode: true, name: true, qrToken: true },
    });
    await this.audit.record(
      req.user.sub,
      "REGENERATE_QR",
      "Asset",
      id,
      undefined,
      { qrTokenChanged: true },
    );
    return this.withQr(updated);
  }

  @Get("scan/:token")
  scan(@Param("token") token: string) {
    return this.prisma.asset.findUniqueOrThrow({
      where: { qrToken: token },
      select: {
        id: true,
        assetCode: true,
        name: true,
        manufacturer: true,
        model: true,
        status: true,
        imageUrl: true,
        category: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
      },
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get("asset-categories")
  categories() {
    return this.prisma.assetCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Post("asset-categories")
  createCategory(@Body() body: CreateCategoryDto) {
    return this.prisma.assetCategory.create({
      data: { ...body, code: body.code.toUpperCase() },
    });
  }
}
