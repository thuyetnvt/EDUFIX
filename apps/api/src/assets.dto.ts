import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { AssetStatus } from "@prisma/client";

export class AssetQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class CreateAssetDto {
  @IsString() @MinLength(2) assetCode!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() categoryId!: string;
  @IsString() locationId!: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  purchasePrice?: number;
  @IsOptional() @IsDateString() warrantyUntil?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateAssetDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsString() description?: string;
}

export class TransferAssetDto {
  @IsString() toLocationId!: string;
  @IsString() @MinLength(3) reason!: string;
}

export class CreateCategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) code!: string;
  @IsOptional() @IsString() description?: string;
}
