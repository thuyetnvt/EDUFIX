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
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaService } from "./prisma.service";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { Roles } from "./roles.decorator";
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto } from "./users.dto";
import { AuditService } from "./audit.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("api/v1/users")
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Get()
  list(@Query("role") role?: Role) {
    return this.prisma.user.findMany({
      where: { ...(role ? { role } : {}) },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  @Roles(Role.ADMIN)
  @Post()
  async create(@Req() req: any, @Body() body: CreateUserDto) {
    const { password, ...data } = body;
    const created = await this.prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
      },
    });
    await this.audit.record(
      req.user.sub,
      "CREATE",
      "User",
      created.id,
      undefined,
      created,
    );
    return created;
  }

  @Roles(Role.ADMIN)
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateUserDto,
  ) {
    const before = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        phone: true,
        active: true,
      },
    });
    await this.audit.record(
      req.user.sub,
      "UPDATE",
      "User",
      id,
      { role: before.role, active: before.active },
      updated,
    );
    return updated;
  }

  @Roles(Role.ADMIN)
  @Patch(":id/status")
  async status(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    const before = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: body.active },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        active: true,
      },
    });
    if (!body.active)
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await this.audit.record(
      req.user.sub,
      "STATUS_CHANGE",
      "User",
      id,
      { active: before.active },
      { active: updated.active },
    );
    return updated;
  }
}
