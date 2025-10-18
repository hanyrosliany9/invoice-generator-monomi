import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RequireSuperAdmin } from "../auth/decorators/auth.decorators";
import { SettingsService } from "./settings.service";
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";
import { UpdateSystemSettingsDto } from "./dto/update-system-settings.dto";
import { UpdateCompanySettingsDto } from "./dto/update-company-settings.dto";

@ApiTags("settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("user")
  @ApiOperation({ summary: "Get user settings" })
  async getUserSettings(@Request() req: any) {
    console.log("Controller: req.user =", req.user);
    console.log("Controller: req.user.id =", req.user?.id);
    return this.settingsService.getUserSettings(req.user?.id);
  }

  @Put("user")
  @ApiOperation({ summary: "Update user settings" })
  async updateUserSettings(
    @Request() req: any,
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.settingsService.updateUserSettings(
      req.user.id,
      updateUserSettingsDto,
    );
  }

  @Get("company")
  @RequireSuperAdmin() // CRITICAL SECURITY: Company settings contain sensitive data (NPWP, bank accounts)
  @ApiOperation({ summary: "Get company settings" })
  async getCompanySettings() {
    return this.settingsService.getCompanySettings();
  }

  @Put("company")
  @RequireSuperAdmin() // CRITICAL SECURITY: Only admins can modify company information
  @ApiOperation({ summary: "Update company settings" })
  async updateCompanySettings(
    @Body() updateCompanySettingsDto: UpdateCompanySettingsDto,
  ) {
    return this.settingsService.updateCompanySettings(updateCompanySettingsDto);
  }

  @Get("system")
  @RequireSuperAdmin() // CRITICAL SECURITY: System settings control application behavior
  @ApiOperation({ summary: "Get system settings" })
  async getSystemSettings() {
    return this.settingsService.getSystemSettings();
  }

  @Put("system")
  @RequireSuperAdmin() // CRITICAL SECURITY: System configuration changes require admin privileges
  @ApiOperation({ summary: "Update system settings" })
  async updateSystemSettings(
    @Body() updateSystemSettingsDto: UpdateSystemSettingsDto,
  ) {
    return this.settingsService.updateSystemSettings(updateSystemSettingsDto);
  }

  @Get("notifications")
  @ApiOperation({ summary: "Get notification preferences" })
  async getNotificationSettings(@Request() req: any) {
    return this.settingsService.getNotificationSettings(req.user.id);
  }

  @Put("notifications")
  @ApiOperation({ summary: "Update notification preferences" })
  async updateNotificationSettings(
    @Request() req: any,
    @Body() notificationSettings: any,
  ) {
    return this.settingsService.updateNotificationSettings(
      req.user.id,
      notificationSettings,
    );
  }

  @Post("reset")
  @ApiOperation({ summary: "Reset settings to default" })
  async resetSettings(@Request() req: any) {
    return this.settingsService.resetUserSettings(req.user.id);
  }
}
