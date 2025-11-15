import React from 'react';
import { Button, Space, Typography, theme } from 'antd';
import { generateSampleData, dataToCSV } from '../../../../../utils/sample-data-generator';

const { Text } = Typography;

interface SampleDataLoaderProps {
  onLoad: (file: File, title: string, description: string) => void;
}

export const SampleDataLoader: React.FC<SampleDataLoaderProps> = ({ onLoad }) => {
  const { token } = theme.useToken();

  const loadSample = (type: 'social_media' | 'sales' | 'analytics') => {
    const data = generateSampleData({ type, rows: 30 });
    const csv = dataToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const file = new File([blob], `sample_${type}.csv`, { type: 'text/csv' });

    const titles: Record<typeof type, string> = {
      social_media: 'Facebook Ads Performance',
      sales: 'Sales Performance',
      analytics: 'Website Analytics',
    };

    const descriptions: Record<typeof type, string> = {
      social_media: 'Sample social media advertising data with metrics',
      sales: 'Sample sales data by product and region',
      analytics: 'Sample website traffic and engagement metrics',
    };

    onLoad(file, titles[type], descriptions[type]);
  };

  return (
    <div
      style={{
        background: token.colorInfoBg,
        padding: token.paddingSM,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorInfoBorder}`,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text strong>Quick Test with Sample Data:</Text>
        <Space wrap>
          <Button size="small" onClick={() => loadSample('social_media')}>
            Load Social Media Sample
          </Button>
          <Button size="small" onClick={() => loadSample('sales')}>
            Load Sales Sample
          </Button>
          <Button size="small" onClick={() => loadSample('analytics')}>
            Load Analytics Sample
          </Button>
        </Space>
      </Space>
    </div>
  );
};
