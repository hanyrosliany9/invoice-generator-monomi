import { useState } from 'react';
import { Modal, Tabs, Card, Button, Empty } from 'antd';
import { useTheme } from '../../theme';
import { templateCategories, SlideTemplateType } from '../../templates/templateTypes';
import { getTemplate } from '../../templates/templateDefinitions';

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateType: SlideTemplateType) => void;
}

const emojiMap: Record<SlideTemplateType, string> = {
  BLANK: '⬜',
  TITLE: '📄',
  MOOD_BOARD: '🎨',
  SHOT_LIST: '📋',
  STORYBOARD: '🎬',
  CHARACTER: '👤',
  LOCATION: '📍',
  COMPARISON: '⚖️',
  GRID_4: '⊞',
  GRID_6: '⊟',
  SCRIPT_BREAKDOWN: '📝',
  CALL_SHEET: '📅',
  TIMELINE: '📊',
};

export default function TemplatePicker({
  open,
  onClose,
  onSelect,
}: TemplatePickerProps) {
  const { theme: themeConfig } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<SlideTemplateType | null>(null);

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
      setSelectedTemplate(null);
    }
  };

  const renderTemplateCard = (templateType: SlideTemplateType) => {
    const template = getTemplate(templateType);
    const isSelected = selectedTemplate === templateType;

    return (
      <Card
        key={templateType}
        hoverable
        style={{
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: isSelected ? `2px solid ${themeConfig.colors.accent.primary}` : `1px solid ${themeConfig.colors.border.default}`,
          boxShadow: isSelected ? `0 0 0 2px ${themeConfig.colors.accent.primary}40` : 'none',
        }}
        onClick={() => setSelectedTemplate(templateType)}
        cover={
          <div style={{ height: 128, backgroundColor: themeConfig.colors.background.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 48 }}>
              {emojiMap[templateType]}
            </div>
          </div>
        }
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{template.name}</div>
          <div style={{ fontSize: 12, color: themeConfig.colors.text.secondary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.description}
          </div>
        </div>
      </Card>
    );
  };

  const tabItems = templateCategories.map((category) => ({
    key: category.id,
    label: category.name,
    children: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, padding: 16 }}>
        {category.templates.map(renderTemplateCard)}
      </div>
    ),
  }));

  return (
    <Modal
      title="Choose Template"
      open={open}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="select"
          type="primary"
          disabled={!selectedTemplate}
          onClick={handleSelect}
        >
          Use Template
        </Button>,
      ]}
    >
      <Tabs items={tabItems} defaultActiveKey="basic" />
    </Modal>
  );
}
