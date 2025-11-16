import { Injectable, Logger } from '@nestjs/common';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import {  ChartConfiguration } from 'chart.js';

/**
 * PDF Template Service
 * Renders widgets server-side using simple, PDF-optimized HTML/CSS
 * No react-grid-layout dependencies - pure static HTML for reliability
 */

// ==================== Type Definitions ====================

interface Layout {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BaseWidget {
  id: string;
  type: string;
  layout: Layout;
  config: any;
}

interface ChartConfig {
  chartType: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  xAxis?: string;
  yAxis?: string[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

interface TextConfig {
  content?: any;
  plainText?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: number;
  fontWeight?: number;
}

interface MetricConfig {
  title: string;
  valueKey: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  precision: number;
  prefix?: string;
  suffix?: string;
  backgroundColor?: string;
  textColor?: string;
}

interface TableConfig {
  columns?: string[];
  showHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  maxRows?: number;
}

interface DataSource {
  columns: Array<{ name: string; type: string }> | Record<string, string>;
  rows: any[];
}

// ==================== Constants ====================

const GRID_COLS = 12;
const ROW_HEIGHT = 30;
const CANVAS_WIDTH = 794; // A4 width at 96 DPI
const CELL_WIDTH = CANVAS_WIDTH / GRID_COLS;
const MARGIN = 16;

@Injectable()
export class PDFTemplateService {
  private readonly logger = new Logger(PDFTemplateService.name);

  /**
   * Calculate pixel dimensions from grid units
   */
  private calculateDimensions(layout: Layout): { width: number; height: number; left: number; top: number } {
    return {
      width: layout.w * CELL_WIDTH - MARGIN,
      height: layout.h * ROW_HEIGHT - MARGIN,
      left: layout.x * CELL_WIDTH,
      top: layout.y * ROW_HEIGHT,
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text?.toString().replace(/[&<>"']/g, (m) => map[m]) || '';
  }

  /**
   * Calculate aggregation value from data
   */
  private calculateAggregation(rows: any[], valueKey: string, aggregation: string): number {
    const values = rows.map(row => parseFloat(row[valueKey])).filter(v => !isNaN(v));

    switch (aggregation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'average':
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return 0;
    }
  }

  /**
   * Format number with precision
   */
  private formatNumber(value: number, precision: number): string {
    return value.toFixed(precision);
  }

  /**
   * Render Chart Widget
   * Uses chartjs-node-canvas to generate actual charts as base64 images
   */
  private async renderChartWidget(widget: BaseWidget, dataSource: DataSource): Promise<string> {
    const config = widget.config as ChartConfig;
    const dim = this.calculateDimensions(widget.layout);

    try {
      // Generate chart image
      const chartImage = await this.generateChartImage(config, dataSource, dim.width - 32, dim.height - 60);

      return `
        <div class="widget-container widget-chart" style="
          position: absolute;
          left: ${dim.left}px;
          top: ${dim.top}px;
          width: ${dim.width}px;
          height: ${dim.height}px;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">
            ${this.escapeHtml(config.title || 'Chart')}
          </h3>
          <div style="width: 100%; height: calc(100% - 40px); display: flex; align-items: center; justify-content: center;">
            <img src="${chartImage}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          </div>
        </div>
      `;
    } catch (error) {
      this.logger.error(`Failed to generate chart for widget ${widget.id}:`, error);
      // Fallback to placeholder if chart generation fails
      return `
        <div class="widget-container widget-chart" style="
          position: absolute;
          left: ${dim.left}px;
          top: ${dim.top}px;
          width: ${dim.width}px;
          height: ${dim.height}px;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;">
            ${this.escapeHtml(config.title || 'Chart')}
          </h3>
          <div style="
            width: 100%;
            height: calc(100% - 40px);
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fee;
            border-radius: 4px;
            color: #c00;
            font-size: 12px;
            padding: 8px;
          ">
            Chart generation failed
          </div>
        </div>
      `;
    }
  }

  /**
   * Generate chart image using ChartJS
   */
  private async generateChartImage(
    config: ChartConfig,
    dataSource: DataSource,
    width: number,
    height: number,
  ): Promise<string> {
    // Prepare data for chart
    const labels: string[] = [];
    const datasets: any[] = [];

    if (config.chartType === 'pie') {
      // Pie charts use single yAxis value
      const valueKey = config.yAxis?.[0] || config.valueKey || '';
      const nameKey = config.nameKey || config.xAxis || '';

      if (valueKey && nameKey) {
        labels.push(...dataSource.rows.map(row => row[nameKey]?.toString() || ''));
        datasets.push({
          label: config.title,
          data: dataSource.rows.map(row => parseFloat(row[valueKey]) || 0),
          backgroundColor: this.generateColors(dataSource.rows.length),
        });
      }
    } else {
      // Line, bar, area charts
      const xAxisKey = config.xAxis || '';
      if (xAxisKey) {
        labels.push(...dataSource.rows.map(row => row[xAxisKey]?.toString() || ''));
      }

      (config.yAxis || []).forEach((yKey, index) => {
        datasets.push({
          label: yKey,
          data: dataSource.rows.map(row => parseFloat(row[yKey]) || 0),
          backgroundColor: config.colors?.[index] || this.getDefaultColor(index),
          borderColor: config.colors?.[index] || this.getDefaultColor(index),
          borderWidth: 2,
          fill: config.chartType === 'area',
        });
      });
    }

    const chartConfiguration: ChartConfiguration = {
      type: this.mapChartType(config.chartType),
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: config.showLegend !== false,
            position: 'bottom',
          },
          title: {
            display: false, // Title is rendered separately
          },
        },
        scales: config.chartType !== 'pie' ? {
          y: {
            beginAtZero: true,
            grid: {
              display: config.showGrid !== false,
            },
          },
          x: {
            grid: {
              display: config.showGrid !== false,
            },
          },
        } : undefined,
      },
      plugins: [{
        id: 'background',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, chart.width, chart.height);
          ctx.restore();
        },
      }],
    };

    // Create chart renderer
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: Math.floor(width),
      height: Math.floor(height),
      backgroundColour: 'white',
    });

    // Generate image
    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfiguration);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Map config chart type to ChartJS type
   */
  private mapChartType(chartType: string): 'line' | 'bar' | 'pie' {
    switch (chartType) {
      case 'area':
        return 'line'; // Area is just a line chart with fill
      case 'pie':
        return 'pie';
      case 'bar':
        return 'bar';
      default:
        return 'line';
    }
  }

  /**
   * Generate color palette
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    ];
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  /**
   * Get default color for dataset
   */
  private getDefaultColor(index: number): string {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    ];
    return colors[index % colors.length];
  }

  /**
   * Render Text Widget
   */
  private renderTextWidget(widget: BaseWidget): string {
    const config = widget.config as TextConfig;
    const dim = this.calculateDimensions(widget.layout);

    const plainText = config.plainText || this.extractPlainTextFromSlate(config.content) || '';
    const alignment = config.alignment || 'left';
    const fontSize = config.fontSize || 14;
    const fontWeight = config.fontWeight || 400;

    return `
      <div class="widget-container widget-text" style="
        position: absolute;
        left: ${dim.left}px;
        top: ${dim.top}px;
        width: ${dim.width}px;
        height: ${dim.height}px;
        padding: 12px;
      ">
        <div style="
          font-size: ${fontSize}px;
          font-weight: ${fontWeight};
          text-align: ${alignment};
          color: #333;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        ">
          ${this.escapeHtml(plainText)}
        </div>
      </div>
    `;
  }

  /**
   * Extract plain text from Slate.js content
   */
  private extractPlainTextFromSlate(content: any): string {
    if (!content || !Array.isArray(content)) return '';

    return content.map(node => {
      if (node.children) {
        return node.children.map((child: any) => child.text || '').join('');
      }
      return '';
    }).join('\n');
  }

  /**
   * Render Metric Widget
   */
  private renderMetricWidget(widget: BaseWidget, dataSource: DataSource): string {
    const config = widget.config as MetricConfig;
    const dim = this.calculateDimensions(widget.layout);

    // Use defaults if not provided (visual builder may not have all fields)
    const aggregation = config.aggregation || 'sum';
    const precision = config.precision ?? 2;
    const value = this.calculateAggregation(dataSource.rows, config.valueKey, aggregation);
    const formattedValue = this.formatNumber(value, precision);
    const displayValue = `${config.prefix || ''}${formattedValue}${config.suffix || ''}`;
    const bgColor = config.backgroundColor || '#f0f9ff';
    const textColor = config.textColor || '#0369a1';

    return `
      <div class="widget-container widget-metric" style="
        position: absolute;
        left: ${dim.left}px;
        top: ${dim.top}px;
        width: ${dim.width}px;
        height: ${dim.height}px;
        background: ${bgColor};
        border: 1px solid ${textColor}33;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <div style="
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          ${this.escapeHtml(config.title)}
        </div>
        <div style="
          font-size: 28px;
          color: ${textColor};
          font-weight: 700;
          line-height: 1;
        ">
          ${this.escapeHtml(displayValue)}
        </div>
      </div>
    `;
  }

  /**
   * Render Table Widget
   * ✅ FIXED: Shows ALL rows with auto height (no overflow clipping)
   */
  private renderTableWidget(widget: BaseWidget, dataSource: DataSource): string {
    const config = widget.config as TableConfig;
    const dim = this.calculateDimensions(widget.layout);

    // Handle both array and object column formats
    let columnNames: string[];
    if (config.columns) {
      columnNames = config.columns;
    } else if (Array.isArray(dataSource.columns)) {
      columnNames = dataSource.columns.map(c => c.name);
    } else {
      // dataSource.columns is an object like { "Day": "DATE", "Results": "NUMBER" }
      columnNames = Object.keys(dataSource.columns);
    }

    // ✅ FIX: Show ALL rows (no maxRows limit) - matches frontend TableWidget behavior
    const rows = dataSource.rows;

    this.logger.log(
      `Rendering table widget: ${columnNames.length} columns × ${rows.length} rows ` +
      `(width: ${dim.width}px, position: ${dim.left}px, ${dim.top}px)`
    );

    return `
      <div class="widget-container widget-table" style="
        position: absolute;
        left: ${dim.left}px;
        top: ${dim.top}px;
        width: ${dim.width}px;
        height: auto;
        overflow: visible;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      ">
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        ">
          ${config.showHeader !== false ? `
            <thead>
              <tr style="background: #f5f5f5;">
                ${columnNames.map(col => `
                  <th style="
                    padding: 8px 12px;
                    text-align: left;
                    font-weight: 600;
                    border-bottom: 2px solid #e0e0e0;
                    color: #333;
                  ">
                    ${this.escapeHtml(col)}
                  </th>
                `).join('')}
              </tr>
            </thead>
          ` : ''}
          <tbody>
            ${rows.map((row, idx) => `
              <tr style="
                ${config.striped && idx % 2 === 1 ? 'background: #fafafa;' : ''}
                ${config.bordered ? 'border-bottom: 1px solid #e0e0e0;' : ''}
              ">
                ${columnNames.map(col => `
                  <td style="
                    padding: 8px 12px;
                    color: #666;
                  ">
                    ${this.escapeHtml(row[col]?.toString() || '')}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Divider Widget
   */
  private renderDividerWidget(widget: BaseWidget): string {
    const dim = this.calculateDimensions(widget.layout);
    const config = widget.config || {};
    const thickness = config.thickness || 1;
    const color = config.color || '#e0e0e0';
    const style = config.style || 'solid';

    return `
      <div class="widget-container widget-divider" style="
        position: absolute;
        left: ${dim.left}px;
        top: ${dim.top}px;
        width: ${dim.width}px;
        height: ${dim.height}px;
        display: flex;
        align-items: center;
      ">
        <hr style="
          width: 100%;
          border: none;
          border-top: ${thickness}px ${style} ${color};
          margin: 0;
        ">
      </div>
    `;
  }

  /**
   * Render Callout Widget
   */
  private renderCalloutWidget(widget: BaseWidget): string {
    const dim = this.calculateDimensions(widget.layout);
    const config = widget.config || {};
    const type = config.type || 'info';

    const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
      info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️' },
      warning: { bg: '#fffbeb', border: '#f59e0b', icon: '⚠️' },
      success: { bg: '#f0fdf4', border: '#22c55e', icon: '✓' },
      error: { bg: '#fef2f2', border: '#ef4444', icon: '✕' },
    };

    const styles = typeStyles[type] || typeStyles.info;
    const plainText = config.plainText || this.extractPlainTextFromSlate(config.content) || '';

    return `
      <div class="widget-container widget-callout" style="
        position: absolute;
        left: ${dim.left}px;
        top: ${dim.top}px;
        width: ${dim.width}px;
        height: ${dim.height}px;
        background: ${styles.bg};
        border-left: 4px solid ${styles.border};
        border-radius: 4px;
        padding: 16px;
        display: flex;
        gap: 12px;
      ">
        ${config.showIcon !== false ? `
          <div style="
            font-size: 20px;
            flex-shrink: 0;
          ">
            ${styles.icon}
          </div>
        ` : ''}
        <div style="flex: 1;">
          ${config.title ? `
            <div style="
              font-weight: 600;
              margin-bottom: 8px;
              color: #333;
            ">
              ${this.escapeHtml(config.title)}
            </div>
          ` : ''}
          <div style="
            color: #666;
            font-size: 14px;
            line-height: 1.6;
          ">
            ${this.escapeHtml(plainText)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render a single widget based on its type
   * Note: In visual builder, all widgets have type='chart' but config.chartType determines actual type
   */
  private async renderWidget(widget: BaseWidget, dataSource: DataSource): Promise<string> {
    try {
      // Determine actual widget type from config.chartType (visual builder pattern)
      const chartType = widget.config?.chartType;

      // Handle visual builder widgets (type='chart' with chartType in config)
      if (widget.type === 'chart' && chartType) {
        switch (chartType) {
          case 'metric_card':
            return this.renderMetricWidget(widget, dataSource);
          case 'table':
            return this.renderTableWidget(widget, dataSource);
          case 'line':
          case 'bar':
          case 'area':
          case 'pie':
            return await this.renderChartWidget(widget, dataSource); // await async chart rendering
          default:
            this.logger.warn(`Unknown chart type: ${chartType}`);
            return await this.renderChartWidget(widget, dataSource);
        }
      }

      // Handle direct widget types (old pattern)
      switch (widget.type) {
        case 'chart':
          return await this.renderChartWidget(widget, dataSource);
        case 'text':
          return this.renderTextWidget(widget);
        case 'metric':
          return this.renderMetricWidget(widget, dataSource);
        case 'table':
          return this.renderTableWidget(widget, dataSource);
        case 'divider':
          return this.renderDividerWidget(widget);
        case 'callout':
          return this.renderCalloutWidget(widget);
        default:
          this.logger.warn(`Unknown widget type: ${widget.type}`);
          return '';
      }
    } catch (error) {
      this.logger.error(`Error rendering widget ${widget.id}:`, error);
      return `
        <div style="
          position: absolute;
          left: ${this.calculateDimensions(widget.layout).left}px;
          top: ${this.calculateDimensions(widget.layout).top}px;
          width: ${this.calculateDimensions(widget.layout).width}px;
          height: ${this.calculateDimensions(widget.layout).height}px;
          background: #fee;
          border: 1px solid #fcc;
          padding: 8px;
          color: #c00;
        ">
          Error rendering widget
        </div>
      `;
    }
  }

  /**
   * Calculate total canvas height based on widgets
   * ✅ FIXED: Tables shrink to content, no extra padding needed
   */
  private calculateCanvasHeight(widgets: BaseWidget[]): number {
    if (widgets.length === 0) return 1123; // A4 height minimum

    const maxY = Math.max(...widgets.map(w => w.layout.y + w.layout.h));

    // Standard padding for all widgets (tables auto-size to content)
    const extraPadding = 100;

    return Math.max(maxY * ROW_HEIGHT + extraPadding, 1123); // Minimum A4 height
  }

  /**
   * Generate complete HTML for a report section
   */
  async generateSectionHTML(
    widgets: BaseWidget[],
    dataSource: DataSource,
    sectionTitle?: string,
  ): Promise<string> {
    const canvasHeight = this.calculateCanvasHeight(widgets);

    // Render all widgets (await async chart rendering)
    const renderedWidgets = await Promise.all(
      widgets.map(widget => this.renderWidget(widget, dataSource))
    );

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${this.escapeHtml(sectionTitle || 'Report Section')}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              background: #ffffff;
            }

            .pdf-canvas {
              width: ${CANVAS_WIDTH}px;
              min-height: ${canvasHeight}px;
              height: auto;
              position: relative;
              background: #ffffff;
              margin: 0 auto;
              overflow: visible;
            }

            /* Print optimizations */
            @media print {
              .widget-container {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-canvas">
            ${renderedWidgets.join('\n')}
          </div>
        </body>
      </html>
    `;
  }
}
