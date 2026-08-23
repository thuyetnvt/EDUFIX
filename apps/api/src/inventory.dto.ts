import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { StockTransactionType } from "@prisma/client";

export class CreatePartDto {
  @IsString() @MinLength(2) partCode!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() category!: string;
  @IsString() unit!: string;
  @Type(() => Number) @IsInt() @Min(0) minimumQuantity = 0;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice = 0;
}

export class UpdatePartDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minimumQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
}

export class CreateStockTransactionDto {
  @IsString() partId!: string;
  @IsEnum(StockTransactionType) type!: StockTransactionType;
  @Type(() => Number) @IsInt() @Min(0) quantity!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsString() incidentId?: string;
  @IsOptional() @IsString() note?: string;
}
