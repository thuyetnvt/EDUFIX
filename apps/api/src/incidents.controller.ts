import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { resolve } from "path";
import { mkdirSync, existsSync } from "fs";
import { writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { AttachmentKind } from "@prisma/client";
import { AuthGuard } from "./auth.guard";
import { IncidentsService } from "./incidents.service";
import {
  AddCommentDto,
  AssignIncidentDto,
  AttachmentMetadataDto,
  ConfirmResolutionDto,
  CreateIncidentDto,
  IncidentQueryDto,
  RatingDto,
  RepairResultDto,
  TransitionIncidentDto,
} from "./incidents.dto";
import { PrismaService } from "./prisma.service";

const uploadDir = resolve(process.cwd(), "uploads");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

function detectedImageMime(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "image/jpeg";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

@ApiTags("incidents")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/v1/incidents")
export class IncidentsController {
  constructor(
    private readonly incidents: IncidentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Req() req: any, @Query() query: IncidentQueryDto) {
    return this.incidents.list(req.user, query);
  }

  @Get(":id")
  detail(@Req() req: any, @Param("id") id: string) {
    return this.incidents.detail(id, req.user);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateIncidentDto) {
    return this.incidents.create(req.user, body);
  }

  @Post(":id/assign")
  assign(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AssignIncidentDto,
  ) {
    return this.incidents.assign(id, req.user, body);
  }

  @Post(":id/transition")
  transition(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: TransitionIncidentDto,
  ) {
    return this.incidents.transition(id, req.user, body);
  }

  @Post(":id/comments")
  comment(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: AddCommentDto,
  ) {
    return this.incidents.comment(id, req.user, body);
  }

  @Post(":id/repair-result")
  repairResult(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: RepairResultDto,
  ) {
    return this.incidents.repairResult(id, req.user, body);
  }

  @Post(":id/confirm")
  confirm(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: ConfirmResolutionDto,
  ) {
    return this.incidents.confirm(id, req.user, body);
  }

  @Post(":id/reopen")
  reopen(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    return this.incidents.confirm(id, req.user, {
      resolved: false,
      reason: body.reason,
    });
  }

  @Post(":id/rating")
  rating(@Req() req: any, @Param("id") id: string, @Body() body: RatingDto) {
    return this.incidents.rate(id, req.user, body);
  }

  @Get(":id/history")
  async history(@Req() req: any, @Param("id") id: string) {
    await this.incidents.detail(id, req.user);
    return this.prisma.incidentStatusHistory.findMany({
      where: { incidentId: id },
      include: { actor: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  @ApiConsumes("multipart/form-data")
  @Post(":id/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) =>
        callback(
          file.mimetype.match(/^image\/(jpeg|png|webp)$/)
            ? null
            : new BadRequestException("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP"),
          Boolean(file.mimetype.match(/^image\/(jpeg|png|webp)$/)),
        ),
    }),
  )
  async attachment(
    @Req() req: any,
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AttachmentMetadataDto,
  ) {
    await this.incidents.detail(id, req.user);
    if (!file) throw new BadRequestException("Vui lòng chọn ảnh");
    const actualMime = detectedImageMime(file.buffer);
    if (!actualMime || actualMime !== file.mimetype)
      throw new BadRequestException("Nội dung tệp không khớp định dạng ảnh");
    const extension =
      actualMime === "image/jpeg"
        ? ".jpg"
        : actualMime === "image/png"
          ? ".png"
          : ".webp";
    const fileName = `${randomBytes(16).toString("hex")}${extension}`;
    await writeFile(resolve(uploadDir, fileName), file.buffer);
    return this.prisma.attachment.create({
      data: {
        incidentId: id,
        uploadedById: req.user.sub,
        fileName: file.originalname,
        fileUrl: `/api/v1/files/${fileName}`,
        mimeType: actualMime,
        fileSize: file.size,
        kind: body.kind ?? AttachmentKind.INCIDENT,
      },
    });
  }
}
