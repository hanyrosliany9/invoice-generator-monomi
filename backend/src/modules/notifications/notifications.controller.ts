import { Controller, Post, Body, UseGuards, Get, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse as ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("send")
  @ApiOperation({ summary: "Send notification email" })
  @ApiResponse({ status: 201, description: "Notification sent successfully" })
  @ApiResponse({ status: 400, description: "Invalid notification data" })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
  ): Promise<ApiResponseDto<null>> {
    try {
      await this.notificationsService.sendNotification(sendNotificationDto);
      return ApiResponseDto.success(null, "Notification sent successfully");
    } catch (error) {
      return ApiResponseDto.error("Failed to send notification", null);
    }
  }

  @Get("test")
  @ApiOperation({ summary: "Test notification system" })
  async testNotification(
    @Query("email") email?: string,
  ): Promise<ApiResponseDto<null>> {
    try {
      const testDto: SendNotificationDto = {
        type: "QUOTATION_STATUS_CHANGE" as any,
        to: email || "test@example.com",
        subject: "Test Notification - Monomi Finance",
        data: {
          quotationNumber: "QUO-2025-001",
          newStatus: "Disetujui",
          clientName: "Test Client",
          projectName: "Test Project",
          totalAmount: "IDR 5,000,000",
        },
      };

      await this.notificationsService.sendNotification(testDto);
      return ApiResponseDto.success(
        null,
        "Test notification sent successfully",
      );
    } catch (error) {
      return ApiResponseDto.error("Failed to send test notification", null);
    }
  }

  @Get("templates")
  @ApiOperation({ summary: "Get available notification templates" })
  async getNotificationTemplates(): Promise<ApiResponseDto<any>> {
    try {
      const templates =
        await this.notificationsService.getNotificationTemplates();
      return ApiResponseDto.success(
        templates,
        "Notification templates retrieved successfully",
      );
    } catch (error) {
      return ApiResponseDto.error(
        "Failed to retrieve notification templates",
        null,
      );
    }
  }
}
