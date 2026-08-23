import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import { LocationType } from "@prisma/client";

export class CreateLocationDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() @MinLength(2) code!: string;
  @IsEnum(LocationType) type!: LocationType;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateLocationDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
