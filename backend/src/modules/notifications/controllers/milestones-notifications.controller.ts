import { Controller, Get, Post, Param, Body, Query, UseGuards, Request, Delete, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt.guard';
import { MilestoneRemindersService } from '../services/milestone-reminders.service';

@ApiTags('Notifications - Milestones')
@Controller('api/notifications/milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class MilestonesNotificationsController {
  constructor(
    private milestoneRemindersService: MilestoneRemindersService
  ) {}

  /**
   * Get summary of pending milestone actions
   * @returns Summary of upcoming, overdue, and overdue payments
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get milestone reminders summary' })
  async getSummary() {
    return this.milestoneRemindersService.getSummary();
  }

  /**
   * Get all reminders for current user
   * @param limit Number of reminders to return
   * @returns Array of milestone reminders
   */
  @Get('reminders')
  @ApiOperation({ summary: 'Get user milestones reminders' })
  async getUserReminders(
    @Request() req,
    @Query('limit') limit: number = 20
  ) {
    return this.milestoneRemindersService.getUserReminders(req.user.id, limit);
  }

  /**
   * Mark a reminder as read
   * @param reminderId ID of reminder to mark as read
   */
  @Patch('reminders/:reminderId/read')
  @ApiOperation({ summary: 'Mark reminder as read' })
  async markAsRead(@Param('reminderId') reminderId: string) {
    await this.milestoneRemindersService.markReminderAsRead(reminderId);
    return { success: true };
  }

  /**
   * Snooze a reminder
   * @param reminderId ID of reminder to snooze
   * @param snoozeMinutes Number of minutes to snooze (default: 60)
   */
  @Post('reminders/:reminderId/snooze')
  @ApiOperation({ summary: 'Snooze a reminder' })
  async snoozeReminder(
    @Param('reminderId') reminderId: string,
    @Body('snoozeMinutes') snoozeMinutes: number = 60
  ) {
    await this.milestoneRemindersService.snoozeReminder(reminderId, snoozeMinutes);
    return { success: true };
  }

  /**
   * Delete a reminder
   * @param reminderId ID of reminder to delete
   */
  @Delete('reminders/:reminderId')
  @ApiOperation({ summary: 'Delete a reminder' })
  async deleteReminder(@Param('reminderId') reminderId: string) {
    // Implementation would delete from database
    return { success: true };
  }

  /**
   * Get upcoming milestones (due within next 7 days)
   */
  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming milestones' })
  async getUpcomingMilestones(
    @Request() req,
    @Query('projectId') projectId?: string
  ) {
    // Implementation would fetch from database
    return {
      upcomingMilestones: [],
      count: 0
    };
  }

  /**
   * Get overdue milestones
   */
  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue milestones' })
  async getOverdueMilestones(
    @Request() req,
    @Query('projectId') projectId?: string
  ) {
    // Implementation would fetch from database
    return {
      overdueMilestones: [],
      count: 0
    };
  }

  /**
   * Get milestones with payment overdue
   */
  @Get('payment-overdue')
  @ApiOperation({ summary: 'Get milestones with overdue payments' })
  async getPaymentOverdue(
    @Request() req,
    @Query('projectId') projectId?: string
  ) {
    // Implementation would fetch from database
    return {
      overduePayments: [],
      totalOutstanding: 0,
      count: 0
    };
  }

  /**
   * Get milestone completion statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get milestone statistics' })
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return {
      totalMilestones: 0,
      completedMilestones: 0,
      pendingMilestones: 0,
      overdueMilestones: 0,
      completionRate: 0,
      averagePaymentCycle: 0,
      onTimePaymentRate: 0
    };
  }

  /**
   * Get reminder preferences for user
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Request() req) {
    return {
      emailNotifications: true,
      pushNotifications: true,
      dueSoonDays: 7,
      overdueDays: 1,
      reminderFrequency: 'daily'
    };
  }

  /**
   * Update reminder preferences
   */
  @Post('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Request() req,
    @Body() preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      dueSoonDays?: number;
      overdueDays?: number;
      reminderFrequency?: 'hourly' | 'daily' | 'weekly' | 'never';
    }
  ) {
    // Implementation would save preferences to database
    return { success: true, preferences };
  }

  /**
   * Manually trigger milestone reminder check (admin only)
   */
  @Post('trigger-check')
  @ApiOperation({ summary: 'Manually trigger reminder checks' })
  async triggerReminderCheck() {
    // This should be admin-only
    try {
      await this.milestoneRemindersService.checkMilestonesDueSoon();
      await this.milestoneRemindersService.checkOverdueMilestones();
      await this.milestoneRemindersService.checkOverduePayments();
      await this.milestoneRemindersService.checkCompletedMilestones();
      await this.milestoneRemindersService.checkRevenueRecognitionRequirements();

      return { success: true, message: 'Reminder checks completed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
