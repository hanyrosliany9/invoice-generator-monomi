import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { DeckSlidesService } from "../services/deck-slides.service";
import { CreateSlideDto } from "../dto/create-slide.dto";
import { UpdateSlideDto } from "../dto/update-slide.dto";
import { ReorderSlidesDto } from "../dto/reorder-slides.dto";

@ApiTags("Deck Slides")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("deck-slides")
export class DeckSlidesController {
  constructor(private readonly slidesService: DeckSlidesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new slide" })
  create(@Request() req: any, @Body() dto: CreateSlideDto) {
    return this.slidesService.create(req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a slide" })
  update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateSlideDto,
  ) {
    return this.slidesService.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a slide" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.slidesService.remove(id, req.user.id);
  }

  @Post(":id/duplicate")
  @ApiOperation({ summary: "Duplicate a slide" })
  duplicate(@Request() req: any, @Param("id") id: string) {
    return this.slidesService.duplicate(id, req.user.id);
  }

  @Post("reorder/:deckId")
  @ApiOperation({ summary: "Reorder slides" })
  reorder(
    @Request() req: any,
    @Param("deckId") deckId: string,
    @Body() dto: ReorderSlidesDto,
  ) {
    return this.slidesService.reorder(deckId, req.user.id, dto);
  }

  @Post(":id/background")
  @ApiOperation({ summary: "Set slide background image" })
  setBackground(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: { url: string; key: string },
  ) {
    return this.slidesService.setBackgroundImage(
      id,
      req.user.id,
      body.url,
      body.key,
    );
  }
}
