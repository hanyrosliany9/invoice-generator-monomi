import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DecksService } from '../services/decks.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';

@ApiTags('Decks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deck' })
  create(@Request() req: any, @Body() dto: CreateDeckDto) {
    return this.decksService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all decks for current user' })
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.decksService.findAll(req.user.id, { status, clientId, projectId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deck by ID' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.decksService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a deck' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDeckDto) {
    return this.decksService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deck' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.decksService.remove(id, req.user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a deck' })
  duplicate(
    @Request() req: any,
    @Param('id') id: string,
    @Body('title') title?: string,
  ) {
    return this.decksService.duplicate(id, req.user.id, title);
  }

  @Post(':id/enable-public-sharing')
  @ApiOperation({ summary: 'Enable public sharing' })
  enablePublicSharing(
    @Request() req: any,
    @Param('id') id: string,
    @Body('accessLevel') accessLevel?: string,
  ) {
    return this.decksService.enablePublicSharing(id, req.user.id, accessLevel);
  }

  @Post(':id/disable-public-sharing')
  @ApiOperation({ summary: 'Disable public sharing' })
  disablePublicSharing(@Request() req: any, @Param('id') id: string) {
    return this.decksService.disablePublicSharing(id, req.user.id);
  }
}
