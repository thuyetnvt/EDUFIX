import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { AttachmentKind, IncidentStatus, Priority } from "@prisma/client";

export class IncidentQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
  @IsOptional() @IsString() assetId?: string;
  @IsOptional() @IsString() technicianId?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() overdue?: boolean;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CreateIncidentDto {
  @IsString() assetId!: string;
  @IsString() @MinLength(4) title!: string;
  @IsString() @MinLength(8) description!: string;
  @IsOptional() @IsEnum(Priority) priority?: Priority;
}

export class AssignIncidentDto {
  @IsString() technicianId!: string;
  @IsOptional() @IsString() note?: string;
}

export class TransitionIncidentDto {
  @IsEnum(IncidentStatus) status!: IncidentStatus;
  @IsOptional() @IsString() note?: string;
}

export class AddCommentDto {
  @IsString() @MinLength(1) content!: string;
  @IsOptional() @IsBoolean() internalOnly = false;
}

export class RepairResultDto {
  @IsString() @MinLength(3) rootCause!: string;
  @IsString() @MinLength(3) resolution!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) laborCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) externalCost?: number;
}

export class ConfirmResolutionDto {
  @IsBoolean() resolved!: boolean;
  @IsOptional() @IsString() reason?: string;
}

export class RatingDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

export class AttachmentMetadataDto {
  @IsOptional() @IsEnum(AttachmentKind) kind?: AttachmentKind;
}
