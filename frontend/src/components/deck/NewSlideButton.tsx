import { useState, useCallback } from 'react';
import { Button, Dropdown, Space } from 'antd';
import type { MenuProps } from 'antd';
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import TemplatePicker from './TemplatePicker';
import { SlideTemplateType } from '../../templates/templateTypes';

interface NewSlideButtonProps {
  onAddSlide: (templateType: SlideTemplateType) => void;
  disabled?: boolean;
}

export default function NewSlideButton({
  onAddSlide,
  disabled,
}: NewSlideButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleQuickAdd = useCallback(() => {
    onAddSlide('BLANK');
  }, [onAddSlide]);

  const handleTemplateSelect = useCallback((type: SlideTemplateType) => {
    onAddSlide(type);
  }, [onAddSlide]);

  const quickTemplates: MenuProps['items'] = [
    { key: 'BLANK', label: 'Blank Slide' },
    { key: 'TITLE', label: 'Title Slide' },
    { type: 'divider' },
    { key: 'MOOD_BOARD', label: 'Mood Board' },
    { key: 'STORYBOARD', label: 'Storyboard' },
    { key: 'SHOT_LIST', label: 'Shot List' },
    { type: 'divider' },
    { key: 'browse', label: 'Browse All Templates...' },
  ];

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'browse') {
      setShowPicker(true);
    } else {
      onAddSlide(key as SlideTemplateType);
    }
  };

  return (
    <>
      <Dropdown.Button
        icon={<AppstoreOutlined />}
        menu={{ items: quickTemplates, onClick: handleMenuClick }}
        onClick={handleQuickAdd}
        disabled={disabled}
      >
        <Space size={4}>
          <PlusOutlined /> New Slide
        </Space>
      </Dropdown.Button>

      <TemplatePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
