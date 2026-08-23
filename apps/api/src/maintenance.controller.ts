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
import { MaintenanceService } from "./maintenance.service";
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
  constructor(private readonly maintenance: MaintenanceService) {}
  @Get("plans") plans() {
    return this.maintenance.listPlans();
  }
  @Post("plans") create(
    @Req() req: any,
    @Body() body: CreateMaintenancePlanDto,
  ) {
    return this.maintenance.create(req.user, body);
  }
  @Get("plans/:id") getPlan(@Param("id") id: string) {
    return this.maintenance.getPlan(id);
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
}
