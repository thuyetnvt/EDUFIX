import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class UpdatePriorityTargetDto {
  @Type(() => Number) @IsInt() @Min(1) responseMinutes!: number;
  @Type(() => Number) @IsInt() @Min(1) resolutionMinutes!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) warningPercent!: number;
}
