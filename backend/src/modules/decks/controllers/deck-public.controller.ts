import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DecksService } from '../services/decks.service';
import { DeckCollaboratorsService } from '../services/deck-collaborators.service';

@ApiTags('Deck Public')
@Controller('deck-public')
export class DeckPublicController {
  constructor(
    private readonly decksService: DecksService,
    private readonly collaboratorsService: DeckCollaboratorsService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get public deck by share token' })
  getPublicDeck(@Param('token') token: string) {
    return this.decksService.findByPublicToken(token);
  }

  @Post('accept-invite/:token')
  @ApiOperation({ summary: 'Accept a guest invite' })
  acceptInvite(
    @Param('token') token: string,
    @Body() body: { name: string; email: string },
  ) {
    return this.collaboratorsService.acceptInvite(token, body);
  }
}
