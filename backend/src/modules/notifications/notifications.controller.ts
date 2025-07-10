import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send notification email' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid notification data' })
  async sendNotification(@Body() sendNotificationDto: SendNotificationDto) {
    await this.notificationsService.sendNotification(sendNotificationDto);
    return { message: 'Notification sent successfully' };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test notification system' })
  async testNotification() {
    const testDto: SendNotificationDto = {
      type: 'QUOTATION_STATUS_CHANGE' as any,
      to: 'test@example.com',
      subject: 'Test Notification',
      data: {
        quotationNumber: 'QUO-2025-001',
        newStatus: 'Disetujui',
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalAmount: 'IDR 5,000,000'
      }
    };

    await this.notificationsService.sendNotification(testDto);
    return { message: 'Test notification sent' };
  }
}