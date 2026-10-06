import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequireAdmin } from "../auth/decorators/auth.decorators";
import { CrmCampaignsService } from "./crm-campaigns.service";
import { CrmLeadsService } from "./crm-leads.service";
import { CrmSettingsService } from "./crm-settings.service";
import { CrmStatsService } from "./crm-stats.service";
import {
  AssignLeadDto,
  BulkLeadsDto,
  ConvertLeadDto,
  CreateActivityDto,
  CreateCampaignDto,
  CreateLeadDto,
  CreateSpendDto,
  CreateStageDto,
  DuplicateQueryDto,
  LinkLeadDto,
  ListLeadsQueryDto,
  MarkLostDto,
  MoveStageDto,
  QuickAddParseDto,
  ReorderStagesDto,
  SetFollowUpDto,
  StatsQueryDto,
  UpdateCampaignDto,
  UpdateCrmSettingsDto,
  UpdateLeadDto,
  UpdateSpendDto,
  UpdateStageDto,
} from "./dto/crm.dto";

/**
 * CRM: leads from WhatsApp ads and other sources.
 * Access: ADMIN / SUPER_ADMIN only (VIDEOGRAPHER is media-collab only in this
 * app's 3-role model, and leads carry client contact details + revenue).
 */
@ApiTags("crm")
@ApiBearerAuth()
@RequireAdmin()
@Controller("crm")
export class CrmController {
  constructor(
    private readonly leads: CrmLeadsService,
    private readonly campaigns: CrmCampaignsService,
    private readonly settings: CrmSettingsService,
    private readonly stats: CrmStatsService,
  ) {}

  private uid(req: any): string | null {
    return req?.user?.id ?? null;
  }

  // ---- leads ------------------------------------------------------------

  @Get("leads")
  @ApiOperation({ summary: "List leads (filters: stage, assignee, campaign, source, follow-up, uncontacted, q)" })
  listLeads(@Query() q: ListLeadsQueryDto, @Req() req: any) {
    return this.leads.list(q, this.uid(req));
  }

  @Get("leads/duplicates")
  async duplicates(@Query() q: DuplicateQueryDto) {
    return { duplicate: await this.leads.findDuplicate(q.phone, q.excludeId) };
  }

  @Post("leads/parse")
  @HttpCode(200)
  @ApiOperation({ summary: "Parse a pasted WhatsApp message (phone, name, campaign code)" })
  parse(@Body() dto: QuickAddParseDto) {
    return this.leads.parseQuickAdd(dto.text);
  }

  @Post("leads")
  createLead(@Body() dto: CreateLeadDto, @Req() req: any) {
    return this.leads.create(dto, this.uid(req));
  }

  @Post("leads/bulk")
  @HttpCode(200)
  bulk(@Body() dto: BulkLeadsDto, @Req() req: any) {
    return this.leads.bulk(dto.ids, { assignedToId: dto.assignedToId, stageId: dto.stageId }, this.uid(req));
  }

  @Get("leads/:id")
  getLead(@Param("id") id: string) {
    return this.leads.get(id);
  }

  @Patch("leads/:id")
  updateLead(@Param("id") id: string, @Body() dto: UpdateLeadDto, @Req() req: any) {
    return this.leads.update(id, dto, this.uid(req));
  }

  @Delete("leads/:id")
  removeLead(@Param("id") id: string) {
    return this.leads.remove(id);
  }

  @Post("leads/:id/stage")
  @HttpCode(200)
  moveStage(@Param("id") id: string, @Body() dto: MoveStageDto, @Req() req: any) {
    return this.leads.moveStage(id, dto.stageId, this.uid(req), dto.note, dto.lostReason);
  }

  @Post("leads/:id/assign")
  @HttpCode(200)
  assign(@Param("id") id: string, @Body() dto: AssignLeadDto, @Req() req: any) {
    return this.leads.assign(id, dto.assignedToId ?? null, this.uid(req));
  }

  @Post("leads/:id/activities")
  addActivity(@Param("id") id: string, @Body() dto: CreateActivityDto, @Req() req: any) {
    return this.leads.addActivity(id, dto.type, dto.body, this.uid(req));
  }

  @Post("leads/:id/follow-up")
  @HttpCode(200)
  setFollowUp(@Param("id") id: string, @Body() dto: SetFollowUpDto, @Req() req: any) {
    return this.leads.setFollowUp(id, dto.at, dto.note, this.uid(req));
  }

  @Post("leads/:id/follow-up/done")
  @HttpCode(200)
  followUpDone(@Param("id") id: string, @Req() req: any) {
    return this.leads.completeFollowUp(id, this.uid(req));
  }

  @Post("leads/:id/lost")
  @HttpCode(200)
  markLost(@Param("id") id: string, @Body() dto: MarkLostDto, @Req() req: any) {
    return this.leads.markLost(id, dto.reason, dto.stageId, this.uid(req));
  }

  @Post("leads/:id/convert")
  @HttpCode(200)
  @ApiOperation({ summary: "Create/link a Client, optional Project and a draft Quotation" })
  convert(@Param("id") id: string, @Body() dto: ConvertLeadDto, @Req() req: any) {
    return this.leads.convert(id, dto, this.uid(req) as string);
  }

  @Post("leads/:id/link")
  @HttpCode(200)
  link(@Param("id") id: string, @Body() dto: LinkLeadDto) {
    return this.leads.link(id, dto);
  }

  @Get("assignees")
  assignees() {
    return this.leads.assignees();
  }

  @Get("badges")
  badges() {
    return this.leads.badges();
  }

  // ---- stats ------------------------------------------------------------

  @Get("stats")
  getStats(@Query() q: StatsQueryDto) {
    return this.stats.stats(q);
  }

  // ---- settings & stages ------------------------------------------------

  @Get("settings")
  getSettings() {
    return this.settings.getSettings();
  }

  @Patch("settings")
  updateSettings(@Body() dto: UpdateCrmSettingsDto) {
    return this.settings.updateSettings(dto);
  }

  @Get("stages")
  listStages() {
    return this.settings.listStages(true);
  }

  @Post("stages")
  createStage(@Body() dto: CreateStageDto) {
    return this.settings.createStage(dto);
  }

  @Put("stages/reorder")
  reorderStages(@Body() dto: ReorderStagesDto) {
    return this.settings.reorderStages(dto.ids);
  }

  @Patch("stages/:id")
  updateStage(@Param("id") id: string, @Body() dto: UpdateStageDto) {
    return this.settings.updateStage(id, dto);
  }

  @Delete("stages/:id")
  deleteStage(@Param("id") id: string) {
    return this.settings.deleteStage(id);
  }

  // ---- campaigns & spend ------------------------------------------------

  @Get("campaigns")
  listCampaigns() {
    return this.campaigns.list();
  }

  @Post("campaigns")
  createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaigns.create(dto);
  }

  @Patch("campaigns/:id")
  updateCampaign(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, dto);
  }

  @Delete("campaigns/:id")
  removeCampaign(@Param("id") id: string) {
    return this.campaigns.remove(id);
  }

  @Get("campaigns/:id/spend")
  listSpend(@Param("id") id: string) {
    return this.campaigns.listSpend(id);
  }

  @Post("campaigns/:id/spend")
  addSpend(@Param("id") id: string, @Body() dto: CreateSpendDto, @Req() req: any) {
    return this.campaigns.addSpend(id, dto, this.uid(req));
  }

  @Patch("spend/:id")
  updateSpend(@Param("id") id: string, @Body() dto: UpdateSpendDto) {
    return this.campaigns.updateSpend(id, dto);
  }

  @Delete("spend/:id")
  removeSpend(@Param("id") id: string) {
    return this.campaigns.removeSpend(id);
  }
}
