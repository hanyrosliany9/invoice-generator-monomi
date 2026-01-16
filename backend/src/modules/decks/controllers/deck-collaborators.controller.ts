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
import { DeckCollaboratorsService } from "../services/deck-collaborators.service";
import { InviteCollaboratorDto } from "../dto/invite-collaborator.dto";

@ApiTags("Deck Collaborators")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("deck-collaborators")
export class DeckCollaboratorsController {
  constructor(
    private readonly collaboratorsService: DeckCollaboratorsService,
  ) {}

  @Post("invite")
  @ApiOperation({ summary: "Invite a collaborator" })
  invite(@Request() req: any, @Body() dto: InviteCollaboratorDto) {
    return this.collaboratorsService.invite(req.user.id, dto);
  }

  @Get("deck/:deckId")
  @ApiOperation({ summary: "Get collaborators for a deck" })
  findByDeck(@Request() req: any, @Param("deckId") deckId: string) {
    return this.collaboratorsService.findByDeck(deckId, req.user.id);
  }

  @Put(":id/role")
  @ApiOperation({ summary: "Update collaborator role" })
  updateRole(
    @Request() req: any,
    @Param("id") id: string,
    @Body("role") role: string,
  ) {
    return this.collaboratorsService.updateRole(id, req.user.id, role);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove a collaborator" })
  remove(@Request() req: any, @Param("id") id: string) {
    return this.collaboratorsService.remove(id, req.user.id);
  }
}
