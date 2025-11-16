import React, { useMemo } from 'react';
import { ChartWidget as ChartWidgetType, DataSource } from '../../../types/report-builder';
import ChartRenderer from '../../reports/ChartRenderer';

interface ChartWidgetProps {
  widget: ChartWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<ChartWidgetType>) => void;
}

const ChartWidgetComponent: React.FC<ChartWidgetProps> = ({ widget, dataSource }) => {
  // Memoize chart config to prevent Recharts recalculation on every render
  const visualizationConfig = useMemo(() => ({
    type: widget.config.chartType,
    title: widget.config.title,
    xAxis: widget.config.xAxis,
    yAxis: widget.config.yAxis,
    nameKey: widget.config.nameKey,
    valueKey: widget.config.valueKey,
  }), [
    widget.config.chartType,
    widget.config.title,
    widget.config.xAxis,
    widget.config.yAxis,
    widget.config.nameKey,
    widget.config.valueKey,
  ]);

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <ChartRenderer config={visualizationConfig} data={dataSource.rows} />
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const ChartWidget = React.memo(
  ChartWidgetComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.widget.id === nextProps.widget.id &&
      JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
      prevProps.dataSource === nextProps.dataSource
    );
  }
);

ChartWidget.displayName = 'ChartWidget';

export default ChartWidget;
