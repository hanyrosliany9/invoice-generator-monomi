import React from 'react';
import { Divider, theme } from 'antd';
import { DividerWidget as DividerWidgetType } from '../../../types/report-builder';

const { useToken } = theme;

interface DividerWidgetProps {
  widget: DividerWidgetType;
  onChange: (updates: Partial<DividerWidgetType>) => void;
}

export const DividerWidget: React.FC<DividerWidgetProps> = ({ widget }) => {
  const { token } = useToken();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <Divider
        style={{
          margin: 0,
          borderWidth: widget.config.thickness || 1,
          borderColor: widget.config.color || token.colorBorder,
          borderStyle: widget.config.style || 'solid',
        }}
      />
    </div>
  );
};

export default DividerWidget;
