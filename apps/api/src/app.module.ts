import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AssetsController } from "./assets.controller";
import { IncidentsController } from "./incidents.controller";
import { DashboardController } from "./dashboard.controller";
import { AiService } from "./ai.service";
import { UsersController } from "./users.controller";
import { RolesGuard } from "./roles.guard";
import { LocationsController } from "./locations.controller";
import { AuditService } from "./audit.service";
import { IncidentsService } from "./incidents.service";
import { FilesController } from "./files.controller";
import {
  AuditLogsController,
  NotificationsController,
  PriorityTargetsController,
} from "./system.controller";
import { ScheduleModule } from "@nestjs/schedule";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { ReportsController } from "./reports.controller";
import { AiController } from "./ai.controller";
import { HealthController } from "./health.controller";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ScheduledAlertsService } from "./scheduled-alerts.service";

const jwtSecret = process.env.JWT_SECRET;
if (
  !jwtSecret ||
  (process.env.NODE_ENV === "production" &&
    jwtSecret.startsWith("replace"))
)
  throw new Error("JWT_SECRET phải được cấu hình bằng giá trị ngẫu nhiên an toàn");

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: "15m" },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    HealthController,
    AuthController,
    UsersController,
    LocationsController,
    AssetsController,
    IncidentsController,
    FilesController,
    MaintenanceController,
    InventoryController,
    NotificationsController,
    PriorityTargetsController,
    AuditLogsController,
    DashboardController,
    ReportsController,
    AiController,
  ],
  providers: [
    PrismaService,
    AuthService,
    AiService,
    AuditService,
    IncidentsService,
    MaintenanceService,
    InventoryService,
    ScheduledAlertsService,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
