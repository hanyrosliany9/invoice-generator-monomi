import {
  Controller,
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
import { DeckElementsService } from "../services/deck-elements.service";
import { CreateElementDto } from "../dto/create-element.dto";
import { UpdateElementDto } from "../dto/update-element.dto";
import { BulkSaveElementsDto } from "../dto/bulk-save-elements.dto";

@ApiTags("Deck Elements")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("deck-elements")
export class DeckElementsController {
  constructor(private readonly elementsService: DeckElementsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new element" })
  create(@Request() req: any, @Body() dto: CreateElementDto) {
    return this.elementsService.create(req.user.id, dto);
  }

  @Put("slide/:slideId/bulk")
  @ApiOperation({
    summary: "Atomically replace all elements for a slide",
  })
  bulkReplaceForSlide(
    @Request() req: any,
    @Param("slideId") slideId: string,
    @Body() dto: BulkSaveElementsDto,
  ) {
    return this.elementsService.bulkReplaceForSlide(slideId, req.user.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an element" })
  update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateElementDto,
  ) {
    return this.elementsService.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an element" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.elementsService.remove(id, req.user.id);
  }

  @Post(":id/bring-to-front")
  @ApiOperation({ summary: "Bring element to front" })
  bringToFront(@Request() req: any, @Param("id") id: string) {
    return this.elementsService.bringToFront(id, req.user.id);
  }

  @Post(":id/send-to-back")
  @ApiOperation({ summary: "Send element to back" })
  sendToBack(@Request() req: any, @Param("id") id: string) {
    return this.elementsService.sendToBack(id, req.user.id);
  }
}
