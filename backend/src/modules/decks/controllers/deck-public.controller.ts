import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
// @Public() marks these routes as intentionally unauthenticated so a future
// global JwtAuthGuard won't accidentally lock them down.
import { Public } from "../../../common/decorators/public.decorator";
import { DecksService } from "../services/decks.service";
import { DeckCollaboratorsService } from "../services/deck-collaborators.service";

@ApiTags("Deck Public")
@Controller("deck-public")
export class DeckPublicController {
  constructor(
    private readonly decksService: DecksService,
    private readonly collaboratorsService: DeckCollaboratorsService,
  ) {}

  @Public()
  @Get(":token")
  @ApiOperation({ summary: "Get public deck by share token" })
  getPublicDeck(@Param("token") token: string) {
    return this.decksService.findByPublicToken(token);
  }

  @Public()
  @Post("accept-invite/:token")
  @ApiOperation({ summary: "Accept a guest invite" })
  acceptInvite(
    @Param("token") token: string,
    @Body() body: { name: string; email: string },
  ) {
    return this.collaboratorsService.acceptInvite(token, body);
  }
}
