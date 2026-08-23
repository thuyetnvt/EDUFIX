import {
  BadRequestException,
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
import { LocationType, Role } from "@prisma/client";
import { AuthGuard } from "./auth.guard";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { PrismaService } from "./prisma.service";
import { CreateLocationDto, UpdateLocationDto } from "./locations.dto";
import { AuditService } from "./audit.service";

const parentType: Partial<Record<LocationType, LocationType>> = {
  BUILDING: LocationType.CAMPUS,
  FLOOR: LocationType.BUILDING,
  ROOM: LocationType.FLOOR,
};

@ApiTags("locations")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller("api/v1/locations")
export class LocationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.location.findMany({
      include: {
        parent: { select: { id: true, name: true, code: true } },
        _count: { select: { assets: true, children: true } },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  @Get("tree")
  async tree() {
    const rows = await this.prisma.location.findMany({
      where: { active: true },
      include: { _count: { select: { assets: true } } },
      orderBy: { name: "asc" },
    });
    const nodes = new Map(
      rows.map((row) => [row.id, { ...row, children: [] as any[] }]),
    );
    const roots: any[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId))
        nodes.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.prisma.location.findUniqueOrThrow({
      where: { id },
      include: {
        parent: true,
        children: true,
        assets: { include: { category: true } },
      },
    });
  }

  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Post()
  async create(@Req() req: any, @Body() body: CreateLocationDto) {
    const expected = parentType[body.type];
    if (expected) {
      const parent = body.parentId
        ? await this.prisma.location.findUnique({
            where: { id: body.parentId },
          })
        : null;
      if (!parent || parent.type !== expected)
        throw new BadRequestException(`Vị trí cha phải có loại ${expected}`);
    } else if (body.parentId)
      throw new BadRequestException("Cơ sở không được có vị trí cha");
    const created = await this.prisma.location.create({
      data: { ...body, code: body.code.toUpperCase() },
    });
    await this.audit.record(
      req.user.sub,
      "CREATE",
      "Location",
      created.id,
      undefined,
      created,
    );
    return created;
  }

  @Roles(Role.ADMIN, Role.FACILITY_MANAGER)
  @Patch(":id")
  async update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateLocationDto,
  ) {
    const before = await this.prisma.location.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.location.update({
      where: { id },
      data: body,
    });
    await this.audit.record(
      req.user.sub,
      "UPDATE",
      "Location",
      id,
      before,
      updated,
    );
    return updated;
  }
}
