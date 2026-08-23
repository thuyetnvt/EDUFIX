import {
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
import { AuthGuard } from "./auth.guard";
import { InventoryService } from "./inventory.service";
import {
  CreatePartDto,
  CreateStockTransactionDto,
  UpdatePartDto,
} from "./inventory.dto";

@ApiTags("inventory")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/v1/inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get("parts") parts() {
    return this.inventory.listParts();
  }
  @Post("parts") create(@Req() req: any, @Body() body: CreatePartDto) {
    return this.inventory.createPart(req.user, body);
  }
  @Get("parts/:id") get(@Param("id") id: string) {
    return this.inventory.getPart(id);
  }
  @Patch("parts/:id") update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: UpdatePartDto,
  ) {
    return this.inventory.updatePart(req.user, id, body);
  }
  @Get("transactions") transactions() {
    return this.inventory.listTransactions();
  }
  @Post("transactions") transact(
    @Req() req: any,
    @Body() body: CreateStockTransactionDto,
  ) {
    return this.inventory.transact(req.user, body);
  }
}
