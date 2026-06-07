import { useTheme } from '../../theme';
import { Popover, Button, Tooltip } from 'antd';
import { FontSizeOutlined } from '@ant-design/icons';
import { Canvas as FabricCanvas } from 'fabric';
import {
  createTextObject,
  createHeadingObject,
  createSubheadingObject,
  createBodyTextObject,
} from '../../utils/deckCanvasUtils';

interface TextStylePickerProps {
  canvas: FabricCanvas | null;
  onTextAdd?: (textType: string) => void;
  disabled?: boolean;
}

const textStyles = [
  { key: 'HEADING', label: 'Title', preview: 'Title', fontSize: 48, fontWeight: 'bold' },
  { key: 'SUBHEADING', label: 'Subtitle', preview: 'Subtitle', fontSize: 32, fontWeight: '500' },
  { key: 'BODY', label: 'Body text', preview: 'Body text', fontSize: 18, fontWeight: 'normal' },
  { key: 'CAPTION', label: 'Caption', preview: 'Caption', fontSize: 14, fontWeight: 'normal' },
];

export default function TextStylePicker({ canvas, onTextAdd, disabled }: TextStylePickerProps) {
  const { theme: themeConfig } = useTheme();
  const handleTextClick = (style: typeof textStyles[0]) => {
    if (!canvas) return;

    const text = createTextObject(style.preview, {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight as any,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    // Enter edit mode immediately
    if (text.enterEditing) {
      text.enterEditing();
      text.selectAll();
    }
    canvas.renderAll();
    onTextAdd?.(style.key);
  };

  const content = (
    <div style={{ width: 200 }}>
      {textStyles.map((style) => (
        <div
          key={style.key}
          onClick={() => handleTextClick(style)}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderRadius: 4,
            marginBottom: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = themeConfig.colors.background.secondary)}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div
            style={{
              fontSize: Math.min(style.fontSize * 0.6, 24),
              fontWeight: style.fontWeight as any,
            }}
          >
            {style.preview}
          </div>
          <div style={{ fontSize: 11, color: themeConfig.colors.text.tertiary }}>{style.label}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip title="Add Text (Ctrl+T)">
      <Popover
        content={content}
        title="Insert Text"
        trigger="click"
        placement="bottom"
      >
        <Button icon={<FontSizeOutlined />} disabled={disabled}>
          Text
        </Button>
      </Popover>
    </Tooltip>
  );
}
