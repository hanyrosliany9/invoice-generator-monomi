import React from 'react';
import { Card, Typography, Space, theme, Divider } from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  EditOutlined,
  DashboardOutlined,
  MinusOutlined,
  InfoCircleOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { WidgetType, WIDGET_DEFAULTS } from '../../types/report-builder';

const { Text } = Typography;
const { useToken } = theme;

interface ComponentPaletteProps {
  onWidgetAdd: (widgetType: WidgetType) => void;
}

interface PaletteItem {
  type: WidgetType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: 'chart' | 'content' | 'data';
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Charts
  {
    type: 'chart',
    label: 'Line Chart',
    icon: <LineChartOutlined />,
    description: 'Show trends over time',
    category: 'chart',
  },
  {
    type: 'chart',
    label: 'Bar Chart',
    icon: <BarChartOutlined />,
    description: 'Compare values',
    category: 'chart',
  },
  {
    type: 'chart',
    label: 'Area Chart',
    icon: <AreaChartOutlined />,
    description: 'Filled line chart',
    category: 'chart',
  },
  {
    type: 'chart',
    label: 'Pie Chart',
    icon: <PieChartOutlined />,
    description: 'Show proportions',
    category: 'chart',
  },

  // Metrics
  {
    type: 'metric',
    label: 'Metric Card',
    icon: <DashboardOutlined />,
    description: 'Display key numbers',
    category: 'content',
  },

  // Content
  {
    type: 'text',
    label: 'Text Block',
    icon: <EditOutlined />,
    description: 'Add commentary',
    category: 'content',
  },
  {
    type: 'callout',
    label: 'Callout',
    icon: <InfoCircleOutlined />,
    description: 'Highlight insights',
    category: 'content',
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: <MinusOutlined />,
    description: 'Visual separator',
    category: 'content',
  },

  // Data
  {
    type: 'table',
    label: 'Data Table',
    icon: <TableOutlined />,
    description: 'Show raw data',
    category: 'data',
  },
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onWidgetAdd }) => {
  const { token } = useToken();

  const groupedItems = PALETTE_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PaletteItem[]>);

  const categoryLabels = {
    chart: '📊 Charts',
    content: '📝 Content',
    data: '📋 Data',
  };

  const renderPaletteItem = (item: PaletteItem) => (
    <Card
      key={`${item.type}-${item.label}`}
      hoverable
      size="small"
      onClick={() => onWidgetAdd(item.type)}
      style={{
        marginBottom: token.marginSM,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      styles={{
        body: {
          padding: token.paddingSM,
        },
      }}
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space>
          <div style={{ fontSize: 18, color: token.colorPrimary }}>
            {item.icon}
          </div>
          <Text strong style={{ fontSize: 13 }}>
            {item.label}
          </Text>
        </Space>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {item.description}
        </Text>
      </Space>
    </Card>
  );

  return (
    <div
      style={{
        maxHeight: 'inherit',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: token.paddingMD,
      }}
    >
      <div style={{ marginBottom: token.marginMD }}>
        <Text strong style={{ fontSize: 16 }}>
          Add Components
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Click to add to canvas
        </Text>
      </div>

      <Divider style={{ margin: `${token.marginSM}px 0` }} />

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category}>
            <div style={{ marginBottom: token.marginXS }}>
              <Text type="secondary" strong style={{ fontSize: 12 }}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </Text>
            </div>
            {items.map(renderPaletteItem)}
          </div>
        ))}
      </Space>

      <Divider style={{ margin: `${token.marginMD}px 0` }} />

      <div
        style={{
          padding: token.paddingSM,
          background: token.colorInfoBg,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorInfoBorder}`,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          💡 <strong>Tip:</strong> Click a widget to add it to the canvas. Drag to reposition, resize handles to adjust size.
        </Text>
      </div>
    </div>
  );
};

export default ComponentPalette;
