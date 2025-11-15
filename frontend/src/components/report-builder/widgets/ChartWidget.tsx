import React from 'react';
import { ChartWidget as ChartWidgetType, DataSource } from '../../../types/report-builder';
import ChartRenderer from '../../reports/ChartRenderer';

interface ChartWidgetProps {
  widget: ChartWidgetType;
  dataSource: DataSource;
  onChange: (updates: Partial<ChartWidgetType>) => void;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, dataSource }) => {
  // Convert our chart config to the format expected by ChartRenderer
  const visualizationConfig = {
    type: widget.config.chartType,
    title: widget.config.title,
    xAxis: widget.config.xAxis,
    yAxis: widget.config.yAxis,
    nameKey: widget.config.nameKey,
    valueKey: widget.config.valueKey,
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <ChartRenderer config={visualizationConfig} data={dataSource.rows} />
    </div>
  );
};

export default ChartWidget;
