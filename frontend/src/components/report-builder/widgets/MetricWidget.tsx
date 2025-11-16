import React, { useState, useEffect } from 'react';
import { Statistic, Card, theme, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons';
import { MetricWidget as MetricWidgetType, DataSource } from '../../../types/report-builder';
import { useDataWorker } from '../../../hooks/useDataWorker';

const { useToken } = theme;

interface MetricWidgetProps {
  widget: MetricWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<MetricWidgetType>) => void;
}

// Threshold for using Web Worker (rows count)
const WEB_WORKER_THRESHOLD = 1000;

const MetricWidgetComponent: React.FC<MetricWidgetProps> = ({ widget, dataSource }) => {
  const { token } = useToken();
  const { aggregate, isReady } = useDataWorker();
  const [metricValue, setMetricValue] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // Use Web Worker for large datasets, otherwise calculate directly
  useEffect(() => {
    const calculateMetric = async () => {
      const rowCount = dataSource.rows.length;

      // Empty dataset
      if (rowCount === 0) {
        setMetricValue(0);
        return;
      }

      // Small dataset - calculate directly on main thread
      if (rowCount < WEB_WORKER_THRESHOLD) {
        const values = dataSource.rows
          .map((row) => row[widget.config.valueKey])
          .filter((v) => typeof v === 'number' || !isNaN(parseFloat(v)))
          .map((v) => parseFloat(v));

        let result = 0;
        if (values.length > 0) {
          switch (widget.config.aggregation) {
            case 'sum':
              result = values.reduce((acc, val) => acc + val, 0);
              break;
            case 'average':
              result = values.reduce((acc, val) => acc + val, 0) / values.length;
              break;
            case 'count':
              result = rowCount;
              break;
            case 'max':
              result = Math.max(...values);
              break;
            case 'min':
              result = Math.min(...values);
              break;
          }
        }
        setMetricValue(result);
        return;
      }

      // Large dataset - use Web Worker to prevent UI freezing
      if (isReady) {
        setIsCalculating(true);
        try {
          // Map aggregation types
          const operation = widget.config.aggregation === 'average' ? 'avg' : widget.config.aggregation;

          const result = await aggregate(
            dataSource.rows,
            widget.config.valueKey,
            operation as 'sum' | 'avg' | 'count' | 'min' | 'max'
          );

          setMetricValue(result);
        } catch (error) {
          console.error('[MetricWidget] Web Worker calculation failed:', error);
          // Fallback to main thread if worker fails
          setMetricValue(0);
        } finally {
          setIsCalculating(false);
        }
      }
    };

    calculateMetric();
  }, [dataSource.rows, widget.config.valueKey, widget.config.aggregation, aggregate, isReady]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: widget.config.backgroundColor || token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        position: 'relative',
      }}
    >
      {isCalculating && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
        </div>
      )}
      <Statistic
        title={widget.config.title}
        value={metricValue}
        precision={widget.config.precision}
        prefix={widget.config.prefix}
        suffix={isCalculating ? '...' : widget.config.suffix}
        valueStyle={{
          color: widget.config.textColor || token.colorPrimary,
          fontSize: '32px',
          fontWeight: 'bold',
        }}
      />
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const MetricWidget = React.memo(
  MetricWidgetComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.widget.id === nextProps.widget.id &&
      JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
      prevProps.dataSource === nextProps.dataSource
    );
  }
);

MetricWidget.displayName = 'MetricWidget';

export default MetricWidget;
