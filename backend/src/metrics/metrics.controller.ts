import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'System health metrics' })
  @ApiResponse({
    status: 200,
    description: 'System health information',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        system: { type: 'object' },
        database: { type: 'object' },
        business: { type: 'object' },
        activity: { type: 'array' },
      },
    },
  })
  async getHealthMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Performance metrics (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        response_time: { type: 'number' },
        database: { type: 'object' },
        memory: { type: 'object' },
        cpu: { type: 'object' },
      },
    },
  })
  async getPerformanceMetrics() {
    return this.metricsService.getPerformanceMetrics();
  }

  @Get('prometheus')
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics format' })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    schema: {
      type: 'string',
    },
  })
  async getPrometheusMetrics() {
    const metrics = await this.metricsService.getSystemMetrics();
    const performanceMetrics = await this.metricsService.getPerformanceMetrics();

    // Convert to Prometheus format
    let prometheusMetrics = '';
    
    // Help and type definitions
    prometheusMetrics += '# HELP system_uptime_seconds System uptime in seconds\n';
    prometheusMetrics += '# TYPE system_uptime_seconds gauge\n';
    prometheusMetrics += `system_uptime_seconds ${metrics.system.uptime}\n\n`;

    prometheusMetrics += '# HELP memory_usage_bytes Memory usage in bytes\n';
    prometheusMetrics += '# TYPE memory_usage_bytes gauge\n';
    prometheusMetrics += `memory_usage_bytes{type="rss"} ${performanceMetrics.memory.rss}\n`;
    prometheusMetrics += `memory_usage_bytes{type="heap_used"} ${performanceMetrics.memory.heap_used}\n`;
    prometheusMetrics += `memory_usage_bytes{type="heap_total"} ${performanceMetrics.memory.heap_total}\n\n`;

    prometheusMetrics += '# HELP database_query_duration_milliseconds Database query duration\n';
    prometheusMetrics += '# TYPE database_query_duration_milliseconds gauge\n';
    prometheusMetrics += `database_query_duration_milliseconds ${performanceMetrics.database.query_time}\n\n`;

    prometheusMetrics += '# HELP business_entities_total Total number of business entities\n';
    prometheusMetrics += '# TYPE business_entities_total gauge\n';
    prometheusMetrics += `business_entities_total{type="users"} ${metrics.business.users || 0}\n`;
    prometheusMetrics += `business_entities_total{type="clients"} ${metrics.business.clients || 0}\n`;
    prometheusMetrics += `business_entities_total{type="projects"} ${metrics.business.projects || 0}\n`;
    prometheusMetrics += `business_entities_total{type="quotations"} ${metrics.business.quotations || 0}\n`;
    prometheusMetrics += `business_entities_total{type="invoices"} ${metrics.business.invoices || 0}\n\n`;

    prometheusMetrics += '# HELP revenue_total_idr Total revenue in Indonesian Rupiah\n';
    prometheusMetrics += '# TYPE revenue_total_idr gauge\n';
    prometheusMetrics += `revenue_total_idr{type="total"} ${metrics.business.totalRevenue || 0}\n`;
    prometheusMetrics += `revenue_total_idr{type="monthly"} ${metrics.business.monthlyRevenue || 0}\n`;
    prometheusMetrics += `revenue_total_idr{type="pending"} ${metrics.business.pendingRevenue || 0}\n\n`;

    return prometheusMetrics;
  }
}