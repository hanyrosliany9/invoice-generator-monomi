import React, { useState, useCallback } from 'react';
import { Alert, Input, theme } from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { CalloutWidget as CalloutWidgetType } from '../../../types/report-builder';

const { TextArea } = Input;
const { useToken } = theme;

interface CalloutWidgetProps {
  widget: CalloutWidgetType;
  onChange: (updates: Partial<CalloutWidgetType>) => void;
  readonly: boolean;
}

const CALLOUT_ICONS = {
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  success: <CheckCircleOutlined />,
  error: <CloseCircleOutlined />,
};

const CalloutWidgetComponent: React.FC<CalloutWidgetProps> = ({ widget, onChange, readonly }) => {
  const { token } = useToken();
  const [content, setContent] = useState(
    typeof widget.config.content === 'string'
      ? widget.config.content
      : JSON.stringify(widget.config.content)
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      onChange({
        config: {
          ...widget.config,
          content: newContent,
        },
      });
    },
    [widget.config, onChange]
  );

  if (readonly) {
    return (
      <Alert
        message={widget.config.title}
        description={content}
        type={widget.config.type}
        showIcon={widget.config.showIcon !== false}
        icon={widget.config.showIcon !== false ? CALLOUT_ICONS[widget.config.type] : undefined}
        style={{ margin: 0 }}
      />
    );
  }

  return (
    <Alert
      message={widget.config.title || `${widget.config.type.toUpperCase()} Callout`}
      description={
        <TextArea
          value={content}
          onChange={handleChange}
          placeholder="Type your callout message here..."
          autoSize={{ minRows: 1, maxRows: 10 }}
          style={{
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            resize: 'none',
            background: 'transparent',
          }}
        />
      }
      type={widget.config.type}
      showIcon={widget.config.showIcon !== false}
      icon={widget.config.showIcon !== false ? CALLOUT_ICONS[widget.config.type] : undefined}
      style={{ margin: 0 }}
    />
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
export const CalloutWidget = React.memo(
  CalloutWidgetComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.widget.id === nextProps.widget.id &&
      prevProps.readonly === nextProps.readonly &&
      JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config)
    );
  }
);

CalloutWidget.displayName = 'CalloutWidget';

export default CalloutWidget;
