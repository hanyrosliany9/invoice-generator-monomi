/**
 * Sample Data Generator for Testing Social Media Reports
 * Generates realistic CSV data for testing the reporting system
 */

export interface SampleDataConfig {
  type: 'social_media' | 'sales' | 'analytics';
  rows: number;
}

/**
 * Generate sample social media performance data
 */
export function generateSocialMediaData(rows: number = 30): any[] {
  const data: any[] = [];
  const startDate = new Date('2024-11-01');

  const campaigns = ['Holiday Sale', 'Product Launch', 'Brand Awareness', 'Retargeting'];

  for (let i = 0; i < rows; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      date: date.toISOString().split('T')[0],
      campaign: campaigns[i % campaigns.length],
      impressions: Math.floor(Math.random() * 50000) + 10000,
      clicks: Math.floor(Math.random() * 2000) + 500,
      spend: parseFloat((Math.random() * 500 + 100).toFixed(2)),
      conversions: Math.floor(Math.random() * 50) + 10,
      ctr: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      cpc: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
    });
  }

  return data;
}

/**
 * Generate sample sales data
 */
export function generateSalesData(rows: number = 30): any[] {
  const data: any[] = [];
  const products = ['Widget A', 'Widget B', 'Widget C', 'Widget D'];
  const regions = ['North', 'South', 'East', 'West'];

  for (let i = 0; i < rows; i++) {
    data.push({
      product: products[i % products.length],
      region: regions[i % regions.length],
      revenue: parseFloat((Math.random() * 10000 + 5000).toFixed(2)),
      units_sold: Math.floor(Math.random() * 100) + 50,
      profit_margin: parseFloat((Math.random() * 30 + 10).toFixed(2)),
    });
  }

  return data;
}

/**
 * Generate sample website analytics data
 */
export function generateAnalyticsData(rows: number = 30): any[] {
  const data: any[] = [];
  const startDate = new Date('2024-11-01');
  const sources = ['Organic', 'Direct', 'Social', 'Paid'];

  for (let i = 0; i < rows; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      date: date.toISOString().split('T')[0],
      source: sources[i % sources.length],
      sessions: Math.floor(Math.random() * 5000) + 1000,
      pageviews: Math.floor(Math.random() * 15000) + 3000,
      bounce_rate: parseFloat((Math.random() * 40 + 30).toFixed(2)),
      avg_session_duration: Math.floor(Math.random() * 300) + 60,
    });
  }

  return data;
}

/**
 * Convert data to CSV string
 */
export function dataToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',')
        ? `"${value}"`
        : value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: any[], filename: string): void {
  const csv = dataToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate sample data based on type
 */
export function generateSampleData(config: SampleDataConfig): any[] {
  switch (config.type) {
    case 'social_media':
      return generateSocialMediaData(config.rows);
    case 'sales':
      return generateSalesData(config.rows);
    case 'analytics':
      return generateAnalyticsData(config.rows);
    default:
      return [];
  }
}
