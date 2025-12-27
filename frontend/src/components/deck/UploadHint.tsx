import { useCallback, useState } from 'react';
import { Button } from 'antd';
import { CloseOutlined, InfoOutlined } from '@ant-design/icons';

export default function UploadHint() {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    setIsVisible(false);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '320px',
        backgroundColor: '#f0f5ff',
        border: '1px solid #d6e4ff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 999,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <InfoOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <strong style={{ color: '#1890ff' }}>Quick Upload Tips</strong>
          </div>
          <div style={{ fontSize: '13px', color: '#595959', lineHeight: '1.6' }}>
            <p style={{ margin: '4px 0' }}>📤 <strong>Drag & drop</strong> images onto the canvas</p>
            <p style={{ margin: '4px 0' }}>📋 <strong>Paste (Ctrl+V)</strong> images from clipboard</p>
            <p style={{ margin: '4px 0' }}>🎯 Images are instantly uploaded to R2</p>
          </div>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleClose}
          style={{ marginTop: '-4px', marginRight: '-8px' }}
        />
      </div>
    </div>
  );
}
