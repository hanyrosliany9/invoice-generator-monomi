import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { DeckCommentsService } from "../services/deck-comments.service";
import { CreateCommentDto } from "../dto/create-comment.dto";

@ApiTags("Deck Comments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("deck-comments")
export class DeckCommentsController {
  constructor(private readonly commentsService: DeckCommentsService) {}

  @Post()
  @ApiOperation({ summary: "Create a comment" })
  create(@Request() req: any, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(req.user.id, dto);
  }

  @Get("slide/:slideId")
  @ApiOperation({ summary: "Get comments for a slide" })
  findBySlide(@Request() req: any, @Param("slideId") slideId: string) {
    return this.commentsService.findBySlide(slideId, req.user.id);
  }

  @Post(":id/resolve")
  @ApiOperation({ summary: "Resolve a comment" })
  resolve(@Request() req: any, @Param("id") id: string) {
    return this.commentsService.resolve(id, req.user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a comment" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.commentsService.remove(id, req.user.id);
  }
}
