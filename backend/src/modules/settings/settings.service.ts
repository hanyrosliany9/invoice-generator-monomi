import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getUserSettings(userId: string) {
    console.log('getUserSettings called with userId:', userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get or create user preferences
    let preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        timezone: 'Asia/Jakarta',
        language: 'id',
        emailNotifications: true,
        pushNotifications: true,
        theme: 'light',
      },
    });

    return {
      user,
      preferences,
    };
  }

  async updateUserSettings(userId: string, updateData: UpdateUserSettingsDto) {
    // Update user basic info
    if (updateData.name || updateData.email) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: updateData.name,
          email: updateData.email,
        },
      });
    }

    // Update user preferences
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        timezone: updateData.timezone,
        language: updateData.language,
        emailNotifications: updateData.emailNotifications,
        pushNotifications: updateData.pushNotifications,
        theme: updateData.theme,
      },
      create: {
        userId,
        timezone: updateData.timezone || 'Asia/Jakarta',
        language: updateData.language || 'id',
        emailNotifications: updateData.emailNotifications ?? true,
        pushNotifications: updateData.pushNotifications ?? true,
        theme: updateData.theme || 'light',
      },
    });

    return preferences;
  }

  async getCompanySettings() {
    let settings = await this.prisma.companySettings.findFirst();

    if (!settings) {
      settings = await this.prisma.companySettings.create({
        data: {
          companyName: 'PT Teknologi Indonesia',
          address: 'Jl. Sudirman No. 123, Jakarta Pusat',
          phone: '021-1234567',
          email: 'info@teknologi.co.id',
          website: 'https://teknologi.co.id',
          taxNumber: '01.234.567.8-901.000',
          currency: 'IDR',
          bankBCA: '1234567890',
          bankMandiri: '0987654321',
          bankBNI: '1122334455',
        },
      });
    }

    return settings;
  }

  async updateCompanySettings(updateData: UpdateCompanySettingsDto) {
    const settings = await this.prisma.companySettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    return settings;
  }

  async getSystemSettings() {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          defaultPaymentTerms: 'NET 30',
          materaiThreshold: 5000000,
          invoicePrefix: 'INV-',
          quotationPrefix: 'QT-',
          autoBackup: true,
          backupFrequency: 'daily',
          backupTime: '02:00',
          autoMateraiReminder: true,
          defaultCurrency: 'IDR',
        },
      });
    }

    return settings;
  }

  async updateSystemSettings(updateData: UpdateSystemSettingsDto) {
    const settings = await this.prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        ...updateData,
      },
    });

    return settings;
  }

  async getNotificationSettings(userId: string) {
    const preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        emailNotifications: true,
        pushNotifications: true,
      },
    });

    return preferences || {
      emailNotifications: true,
      pushNotifications: true,
    };
  }

  async updateNotificationSettings(userId: string, notificationData: any) {
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        emailNotifications: notificationData.emailNotifications,
        pushNotifications: notificationData.pushNotifications,
      },
      create: {
        userId,
        emailNotifications: notificationData.emailNotifications ?? true,
        pushNotifications: notificationData.pushNotifications ?? true,
        timezone: 'Asia/Jakarta',
        language: 'id',
        theme: 'light',
      },
    });

    return preferences;
  }

  async resetUserSettings(userId: string) {
    await this.prisma.userPreferences.upsert({
      where: { userId },
      update: {
        timezone: 'Asia/Jakarta',
        language: 'id',
        emailNotifications: true,
        pushNotifications: true,
        theme: 'light',
      },
      create: {
        userId,
        timezone: 'Asia/Jakarta',
        language: 'id',
        emailNotifications: true,
        pushNotifications: true,
        theme: 'light',
      },
    });

    return { message: 'Settings reset to default values' };
  }
}