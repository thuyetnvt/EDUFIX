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
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard";
import { MaintenanceService } from "./maintenance.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { AttachmentKind } from "@prisma/client";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import { resolve } from "path";
import { PrismaService } from "./prisma.service";
import {
  CompleteMaintenanceTaskDto,
  CreateMaintenancePlanDto,
  UpdateMaintenancePlanDto,
} from "./maintenance.dto";

@ApiTags("maintenance")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/v1/maintenance")
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService, private readonly prisma: PrismaService) {}
  @Get("plans") plans(@Req() req: any) {
    return this.maintenance.listPlans(req.user);
  }
  @Post("plans") create(
    @Req() req: any,
    @Body() body: CreateMaintenancePlanDto,
  ) {
    return this.maintenance.create(req.user, body);
  }
  @Get("plans/:id") getPlan(@Req() req: any, @Param("id") id: string) {
    return this.maintenance.getPlan(req.user, id);
  }
  @Patch("plans/:id") update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdateMaintenancePlanDto,
  ) {
    return this.maintenance.update(req.user, id, body);
  }
  @Get("tasks") tasks(@Req() req: any) {
    return this.maintenance.listTasks(req.user);
  }
  @Get("tasks/:id") getTask(@Req() req: any, @Param("id") id: string) {
    return this.maintenance.getTask(req.user, id);
  }
  @Post("tasks/:id/start") start(@Req() req: any, @Param("id") id: string) {
    return this.maintenance.start(req.user, id);
  }
  @Post("tasks/:id/complete") complete(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: CompleteMaintenanceTaskDto,
  ) {
    return this.maintenance.complete(req.user, id, body);
  }

  @Post("tasks/:id/attachments")
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(
      file.mimetype.match(/^image\/(jpeg|png|webp)$/) ? null : new BadRequestException("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP"),
      Boolean(file.mimetype.match(/^image\/(jpeg|png|webp)$/)),
    ),
  }))
  async attachment(@Req() req: any, @Param("id") id: string, @UploadedFile() file: Express.Multer.File, @Body("kind") kind?: AttachmentKind) {
    await this.maintenance.getTask(req.user, id);
    if (!file) throw new BadRequestException("Vui lòng chọn ảnh");
    const actualMime = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
        ? "image/jpeg"
        : file.buffer.toString("ascii", 0, 4) === "RIFF" && file.buffer.toString("ascii", 8, 12) === "WEBP"
          ? "image/webp" : null;
    if (!actualMime || actualMime !== file.mimetype) throw new BadRequestException("Nội dung tệp không khớp định dạng ảnh");
    const uploadDir = resolve(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    const extension = actualMime === "image/jpeg" ? ".jpg" : actualMime === "image/png" ? ".png" : ".webp";
    const fileName = `${randomBytes(16).toString("hex")}${extension}`;
    await writeFile(resolve(uploadDir, fileName), file.buffer);
    return this.prisma.attachment.create({ data: { maintenanceTaskId: id, uploadedById: req.user.sub, fileName: file.originalname, fileUrl: `/api/v1/files/${fileName}`, mimeType: actualMime, fileSize: file.size, kind: kind ?? AttachmentKind.MAINTENANCE } });
  }
}
