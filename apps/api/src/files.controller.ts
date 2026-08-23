import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { basename, resolve } from "path";
import { existsSync } from "fs";

@ApiTags("files")
@Controller("api/v1/files")
export class FilesController {
  @Get(":name")
  file(@Param("name") name: string, @Res() response: Response) {
    if (name !== basename(name)) throw new NotFoundException();
    const root = resolve(process.cwd(), "uploads");
    const target = resolve(root, name);
    if (!existsSync(target)) throw new NotFoundException("Không tìm thấy tệp");
    return response.sendFile(name, { root });
  }
}
