import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { getErrorMessage } from '../common/utils/error-handling.util';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  async getSystemMetrics() {
    const startTime = Date.now();

    try {
      // Database health check
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - startTime;

      // Get system statistics
      const [
        userCount,
        clientCount,
        projectCount,
        quotationCount,
        invoiceCount,
        recentActivity,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.client.count(),
        this.prisma.project.count(),
        this.prisma.quotation.count(),
        this.prisma.invoice.count(),
        this.getRecentActivity(),
      ]);

      // Revenue metrics
      const revenueMetrics = await this.getRevenueMetrics();

      return {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
        database: {
          status: 'healthy',
          latency: dbLatency,
        },
        business: {
          users: userCount,
          clients: clientCount,
          projects: projectCount,
          quotations: quotationCount,
          invoices: invoiceCount,
          ...revenueMetrics,
        },
        activity: recentActivity,
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
        database: {
          status: 'unhealthy',
          error: getErrorMessage(error),
        },
        business: {
          users: 0,
          clients: 0,
          projects: 0,
          quotations: 0,
          invoices: 0,
          totalRevenue: 0,
          monthlyRevenue: 0,
          pendingRevenue: 0,
        },
        activity: [],
      };
    }
  }

  private async getRevenueMetrics() {
    const [totalRevenue, monthlyRevenue, pendingRevenue] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          status: { in: ['SENT', 'DRAFT'] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      pendingRevenue: pendingRevenue._sum.totalAmount || 0,
    };
  }

  private async getRecentActivity() {
    const recentAudits = await this.prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return recentAudits.map(audit => ({
      action: audit.action,
      entityType: audit.entityType,
      entityId: audit.entityId,
      timestamp: audit.createdAt,
      user: audit.user.name,
    }));
  }

  async getPerformanceMetrics() {
    const startTime = Date.now();

    // Database performance check
    const dbStart = Date.now();
    await this.prisma.$queryRaw`SELECT COUNT(*) FROM "users"`;
    const dbTime = Date.now() - dbStart;

    // Memory usage
    const memoryUsage = process.memoryUsage();

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime,
      database: {
        query_time: dbTime,
        connection_pool: {
          // These would be actual pool stats in production
          active: 1,
          idle: 2,
          total: 3,
        },
      },
      memory: {
        rss: memoryUsage.rss,
        heap_used: memoryUsage.heapUsed,
        heap_total: memoryUsage.heapTotal,
        external: memoryUsage.external,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    };
  }
}