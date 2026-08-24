import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { RecurrenceType } from "@prisma/client";

export class CreateMaintenancePlanDto {
  @IsString() assetId!: string;
  @IsString() @MinLength(3) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(RecurrenceType) recurrenceType!: RecurrenceType;
  @IsOptional() @IsInt() @Min(1) interval = 1;
  @IsDateString() startDate!: string;
  @IsOptional() @IsString() assignedTechnicianId?: string;
  @IsArray() checklist!: string[];
}

export class UpdateMaintenancePlanDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() assignedTechnicianId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CompleteMaintenanceTaskDto {
  @IsArray() checklistResult!: Array<{
    item: string;
    completed: boolean;
    note?: string;
  }>;
  @IsOptional() @IsString() note?: string;
}
