import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "./auth.guard";
import { AiService } from "./ai.service";
import { ClassifyIncidentDto, FindDuplicatesDto } from "./ai.dto";

@ApiTags("ai")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/v1/ai")
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post("classify-incident") classify(@Body() body: ClassifyIncidentDto) {
    return this.ai.classify(
      body.title,
      body.description,
      body.assetCategory,
      body.locationContext,
    );
  }
  @Post("find-duplicates") duplicates(@Body() body: FindDuplicatesDto) {
    return this.ai.findDuplicates(body.assetId, body.title, body.description);
  }
}
