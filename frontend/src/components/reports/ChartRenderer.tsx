import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, Statistic, Table, Typography, Alert } from 'antd';
import { VisualizationConfig } from '../../types/report';
import ChartErrorBoundary from './ChartErrorBoundary';

const { Title, Text } = Typography;

interface ChartRendererProps {
  config: VisualizationConfig;
  data: any[];
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#8dd1e1',
  '#d084d0',
];

// Helper: Parse string numbers to actual numbers
const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

// Helper: Validate data has required columns
const validateDataColumns = (data: any[], requiredColumns: string[]): { valid: boolean; missing: string[] } => {
  if (!data || data.length === 0) {
    return { valid: false, missing: requiredColumns };
  }

  const availableColumns = Object.keys(data[0]);
  const missing = requiredColumns.filter(col => !availableColumns.includes(col));

  return { valid: missing.length === 0, missing };
};

// Helper: Clean and normalize data for charts
const normalizeChartData = (data: any[], numericColumns: string[]): any[] => {
  return data.map(row => {
    const normalized: any = { ...row };
    numericColumns.forEach(col => {
      if (col in row) {
        const parsed = parseNumber(row[col]);
        normalized[col] = parsed !== null ? parsed : 0;
      }
    });
    return normalized;
  });
};

// Helper: Aggregate pie chart data by name
const aggregatePieData = (data: any[], nameKey: string, valueKey: string, topN: number = 10): any[] => {
  const aggregated = new Map<string, number>();

  data.forEach(row => {
    const name = String(row[nameKey] || 'Unknown');
    const value = parseNumber(row[valueKey]) || 0;
    aggregated.set(name, (aggregated.get(name) || 0) + value);
  });

  // Convert to array and sort by value descending
  const sorted = Array.from(aggregated.entries())
    .map(([name, value]) => ({ [nameKey]: name, [valueKey]: value }))
    .sort((a, b) => {
      const aVal = typeof a[valueKey] === 'number' ? a[valueKey] : 0;
      const bVal = typeof b[valueKey] === 'number' ? b[valueKey] : 0;
      return bVal - aVal;
    });

  // If more than topN items, aggregate the rest into "Other"
  if (sorted.length > topN) {
    const topItems = sorted.slice(0, topN);
    const otherValue = sorted.slice(topN).reduce((sum, item) => {
      const val = typeof item[valueKey] === 'number' ? item[valueKey] : 0;
      return sum + val;
    }, 0);
    if (otherValue > 0) {
      topItems.push({ [nameKey]: 'Other', [valueKey]: otherValue });
    }
    return topItems;
  }

  return sorted;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({ config: rawConfig, data }) => {
  // CRITICAL FIX: Filter out empty rows (defensive programming)
  // Empty rows can break Recharts rendering
  const cleanData = data.filter((row) => {
    // Check if at least one value in the row is non-empty
    return Object.values(row).some((value) => {
      if (value === null || value === undefined) return false;
      const str = String(value).trim();
      return str !== '';
    });
  });

  // Normalize config: accept both 'type' and 'chartType' for backward compatibility
  let config: VisualizationConfig = {
    ...rawConfig,
    type: (rawConfig as any).chartType || rawConfig.type, // Prefer chartType if present, fall back to type
  };

  // Ensure yAxis is always an array for line/bar/area charts
  if (config.type === 'line' || config.type === 'bar' || config.type === 'area') {
    if (!Array.isArray(config.yAxis)) {
      // Convert string to single-element array (preserve existing data!)
      config = {
        ...config,
        yAxis: config.yAxis ? [config.yAxis as any] : []
      };
    }
  }
  const renderLineChart = () => {
    if (!config.xAxis || !config.yAxis || !Array.isArray(config.yAxis) || config.yAxis.length === 0) {
      return <Alert message="Invalid configuration: xAxis and yAxis are required" type="error" showIcon />;
    }

    // Validate data has required columns
    const requiredColumns = [config.xAxis, ...config.yAxis];
    const validation = validateDataColumns(cleanData, requiredColumns);
    if (!validation.valid) {
      return (
        <Alert
          message="Missing Data Columns"
          description={`The following columns are missing from the data: ${validation.missing.join(', ')}`}
          type="error"
          showIcon
        />
      );
    }

    // Normalize numeric data
    const normalizedData = normalizeChartData(cleanData, config.yAxis);

    return (
      <div style={{ width: '100%', minHeight: '400px' }}>
        <ResponsiveContainer width="99%" height={400}>
          <LineChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xAxis} />
          <YAxis />
          <Tooltip />
          <Legend />
          {config.yAxis.map((yKey, index) => (
            <Line
              key={yKey}
              type="monotone"
              dataKey={yKey}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderBarChart = () => {
    if (!config.xAxis || !config.yAxis || !Array.isArray(config.yAxis) || config.yAxis.length === 0) {
      return <Alert message="Invalid configuration: xAxis and yAxis are required" type="error" showIcon />;
    }

    // Validate data has required columns
    const requiredColumns = [config.xAxis, ...config.yAxis];
    const validation = validateDataColumns(cleanData, requiredColumns);
    if (!validation.valid) {
      return (
        <Alert
          message="Missing Data Columns"
          description={`The following columns are missing from the data: ${validation.missing.join(', ')}`}
          type="error"
          showIcon
        />
      );
    }

    // Normalize numeric data
    const normalizedData = normalizeChartData(cleanData, config.yAxis);

    return (
      <div style={{ width: '100%', minHeight: '400px' }}>
        <ResponsiveContainer width="99%" height={400}>
          <BarChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xAxis} />
          <YAxis />
          <Tooltip />
          <Legend />
          {config.yAxis.map((yKey, index) => (
            <Bar
              key={yKey}
              dataKey={yKey}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPieChart = () => {
    if (!config.nameKey || !config.valueKey) {
      return <Alert message="Invalid configuration: nameKey and valueKey are required for pie chart" type="error" showIcon />;
    }

    // Validate data has required columns
    const requiredColumns = [config.nameKey, config.valueKey];
    const validation = validateDataColumns(cleanData, requiredColumns);
    if (!validation.valid) {
      return (
        <Alert
          message="Missing Data Columns"
          description={`The following columns are missing from the data: ${validation.missing.join(', ')}`}
          type="error"
          showIcon
        />
      );
    }

    // Aggregate and limit pie chart data to top 10 slices
    const aggregatedData = aggregatePieData(cleanData, config.nameKey, config.valueKey, 10);

    return (
      <div style={{ width: '100%', minHeight: '400px' }}>
        <ResponsiveContainer width="99%" height={400}>
          <PieChart>
          <Pie
            data={aggregatedData}
            dataKey={config.valueKey}
            nameKey={config.nameKey}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label
          >
            {aggregatedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderAreaChart = () => {
    if (!config.xAxis || !config.yAxis || !Array.isArray(config.yAxis) || config.yAxis.length === 0) {
      return <Alert message="Invalid configuration: xAxis and yAxis are required" type="error" showIcon />;
    }

    // Validate data has required columns
    const requiredColumns = [config.xAxis, ...config.yAxis];
    const validation = validateDataColumns(cleanData, requiredColumns);
    if (!validation.valid) {
      return (
        <Alert
          message="Missing Data Columns"
          description={`The following columns are missing from the data: ${validation.missing.join(', ')}`}
          type="error"
          showIcon
        />
      );
    }

    // Normalize numeric data
    const normalizedData = normalizeChartData(cleanData, config.yAxis);

    return (
      <div style={{ width: '100%', minHeight: '400px' }}>
        <ResponsiveContainer width="99%" height={400}>
          <AreaChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={config.xAxis} />
          <YAxis />
          <Tooltip />
          <Legend />
          {config.yAxis.map((yKey, index) => (
            <Area
              key={yKey}
              type="monotone"
              dataKey={yKey}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderTable = () => {
    if (!cleanData || cleanData.length === 0) {
      return <Alert message="No data available" type="info" showIcon />;
    }

    const columns = Object.keys(cleanData[0]).map((key) => ({
      title: key,
      dataIndex: key,
      key: key,
      sorter: (a: any, b: any) => {
        const aVal = a[key];
        const bVal = b[key];

        // Try to parse as numbers first
        const aNum = parseNumber(aVal);
        const bNum = parseNumber(bVal);

        if (aNum !== null && bNum !== null) {
          return aNum - bNum;
        }

        // Fall back to string comparison
        return String(aVal || '').localeCompare(String(bVal || ''));
      },
    }));

    return (
      <Table
        columns={columns}
        dataSource={cleanData.map((row, index) => ({ ...row, key: index }))}
        pagination={false}
        scroll={{ x: true }}
        size="small"
      />
    );
  };

  const renderMetricCard = () => {
    // If no valueKey is configured, show helpful message with available columns
    if (!config.valueKey) {
      const availableColumns = cleanData && cleanData.length > 0 ? Object.keys(cleanData[0]) : [];
      const numericColumns = availableColumns.filter(col => {
        if (cleanData.length === 0) return false;
        const sampleValue = parseNumber(cleanData[0][col]);
        return sampleValue !== null;
      });

      return (
        <Alert
          message="Configuration Required"
          description={
            numericColumns.length > 0
              ? `Please configure a value column. Available numeric columns: ${numericColumns.join(', ')}`
              : 'Please configure a value column for this metric card'
          }
          type="warning"
          showIcon
        />
      );
    }

    // Validate data has required column
    const validation = validateDataColumns(cleanData, [config.valueKey]);
    if (!validation.valid) {
      const availableColumns = cleanData && cleanData.length > 0 ? Object.keys(cleanData[0]) : [];
      return (
        <Alert
          message="Missing Data Column"
          description={`The column '${config.valueKey}' is missing from the data. Available columns: ${availableColumns.join(', ')}`}
          type="error"
          showIcon
        />
      );
    }

    // Parse all values to numbers (handles string numbers)
    const values = cleanData
      .map((row) => config.valueKey ? parseNumber(row[config.valueKey]) : null)
      .filter((v) => v !== null) as number[];

    if (values.length === 0) {
      return (
        <Card style={{ textAlign: 'center' }}>
          <Statistic
            title={config.title || config.valueKey}
            value={0}
            precision={config.precision || 0}
            valueStyle={{ fontSize: '36px', fontWeight: 'bold', color: '#999' }}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>No valid numeric data</Text>
        </Card>
      );
    }

    let metricValue = 0;
    let prefix = '';
    let suffix = '';

    switch (config.aggregation || 'sum') {
      case 'sum':
        metricValue = values.reduce((acc, val) => acc + val, 0);
        break;
      case 'average':
        metricValue = values.reduce((acc, val) => acc + val, 0) / values.length;
        prefix = 'Avg: ';
        break;
      case 'count':
        metricValue = data.length;
        suffix = ' items';
        break;
      case 'max':
        metricValue = Math.max(...values);
        prefix = 'Max: ';
        break;
      case 'min':
        metricValue = Math.min(...values);
        prefix = 'Min: ';
        break;
      default:
        metricValue = values.reduce((acc, val) => acc + val, 0);
    }

    return (
      <Card style={{ textAlign: 'center' }}>
        <Statistic
          title={config.title || config.valueKey}
          value={metricValue}
          precision={config.precision || 0}
          prefix={prefix}
          suffix={suffix}
          valueStyle={{ fontSize: '36px', fontWeight: 'bold', color: '#3f8600' }}
        />
      </Card>
    );
  };

  const renderChart = () => {
    switch (config.type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      case 'table':
        return renderTable();
      case 'metric_card':
        return renderMetricCard();
      default:
        return <div>Unknown chart type: {config.type}</div>;
    }
  };

  return (
    <ChartErrorBoundary chartTitle={config.title}>
      <Card
        title={config.title}
        style={{ marginBottom: '24px' }}
        styles={{ body: { padding: config.type === 'metric_card' ? '24px' : '12px' } }}
      >
        {renderChart()}
      </Card>
    </ChartErrorBoundary>
  );
};

export default ChartRenderer;
