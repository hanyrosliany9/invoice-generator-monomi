import { useTheme } from '../../theme';
import { useState, useEffect, useRef } from 'react';
import { Input, Button, Space } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

interface InlineTextEditorProps {
  initialText: string;
  position: { x: number; y: number };
  width: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export default function InlineTextEditor({
  initialText,
  position,
  width,
  fontSize,
  fontFamily,
  color,
  textAlign,
  onSave,
  onCancel,
}: InlineTextEditorProps) {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(text);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        borderRadius: 4,
        padding: 4,
      }}
    >
      <Input.TextArea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: Math.max(width, 200),
          minHeight: 60,
          fontSize,
          fontFamily,
          color,
          textAlign: textAlign as any,
          border: 'none',
          resize: 'both',
        }}
        autoSize={{ minRows: 1, maxRows: 10 }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <Space size={4}>
          <Button size="small" icon={<CloseOutlined />} onClick={onCancel} />
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => onSave(text)} />
        </Space>
      </div>
    </div>
  );
}
