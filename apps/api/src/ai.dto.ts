import { IsOptional, IsString, MinLength } from "class-validator";

export class ClassifyIncidentDto {
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(5) description!: string;
  @IsOptional() @IsString() assetCategory?: string;
  @IsOptional() @IsString() locationContext?: string;
}

export class FindDuplicatesDto {
  @IsString() assetId!: string;
  @IsString() @MinLength(3) title!: string;
  @IsString() @MinLength(5) description!: string;
}
