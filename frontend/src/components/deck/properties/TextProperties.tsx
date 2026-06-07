import { useEffect, useState } from 'react';
import { Select, InputNumber, ColorPicker, Space, Button, Tooltip } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from '@ant-design/icons';
import type { IText } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';

// Common fonts
const fontOptions = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
];

interface TextPropertiesProps {
  object: IText;
}

export default function TextProperties({ object }: TextPropertiesProps) {
  const { canvas, pushHistory } = useDeckCanvasStore();

  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontSize, setFontSize] = useState(24);
  const [fontWeight, setFontWeight] = useState<string>('normal');
  const [fontStyle, setFontStyle] = useState<string>('normal');
  const [underline, setUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fill, setFill] = useState<string>('#1f2937');
  const [lineHeight, setLineHeight] = useState(1.2);
  const [charSpacing, setCharSpacing] = useState(0);

  // Sync with object
  useEffect(() => {
    if (!object) return;

    setFontFamily(object.fontFamily || 'Inter, sans-serif');
    setFontSize((object.fontSize || 24) as number);
    setFontWeight((object.fontWeight as string) || 'normal');
    setFontStyle(object.fontStyle || 'normal');
    setUnderline(object.underline || false);
    setTextAlign(object.textAlign || 'left');
    setFill((object.fill as string) || '#1f2937');
    setLineHeight((object.lineHeight || 1.2) as number);
    setCharSpacing((object.charSpacing || 0) as number);
  }, [object]);

  const updateObject = (changes: Record<string, any>) => {
    if (!object || !canvas) return;
    object.set(changes);
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
  };

  return (
    <PropertySection title="Text">
      {/* Font Family */}
      <PropertyRow label="Font">
        <Select
          size="small"
          value={fontFamily}
          onChange={(v) => {
            setFontFamily(v);
            updateObject({ fontFamily: v });
          }}
          options={fontOptions}
          style={{ width: '100%' }}
          showSearch
        />
      </PropertyRow>

      {/* Font Size */}
      <PropertyRow label="Size" inline>
        <InputNumber
          size="small"
          value={fontSize}
          onChange={(v) => {
            if (v) {
              setFontSize(v);
              updateObject({ fontSize: v });
            }
          }}
          min={8}
          max={200}
          suffix="px"
          style={{ width: 80 }}
        />
      </PropertyRow>

      {/* Text Color */}
      <PropertyRow label="Color" inline>
        <ColorPicker
          value={fill}
          onChange={(color) => {
            const hex = color.toHexString();
            setFill(hex);
            updateObject({ fill: hex });
          }}
          showText
        />
      </PropertyRow>

      {/* Font Style Buttons */}
      <PropertyRow label="Style">
        <Space size={4}>
          <Tooltip title="Bold">
            <Button
              size="small"
              type={fontWeight === 'bold' ? 'primary' : 'default'}
              icon={<BoldOutlined />}
              onClick={() => {
                const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
                setFontWeight(newWeight);
                updateObject({ fontWeight: newWeight });
              }}
            />
          </Tooltip>
          <Tooltip title="Italic">
            <Button
              size="small"
              type={fontStyle === 'italic' ? 'primary' : 'default'}
              icon={<ItalicOutlined />}
              onClick={() => {
                const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
                setFontStyle(newStyle);
                updateObject({ fontStyle: newStyle });
              }}
            />
          </Tooltip>
          <Tooltip title="Underline">
            <Button
              size="small"
              type={underline ? 'primary' : 'default'}
              icon={<UnderlineOutlined />}
              onClick={() => {
                setUnderline(!underline);
                updateObject({ underline: !underline });
              }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Text Alignment */}
      <PropertyRow label="Align">
        <Space size={4}>
          <Tooltip title="Align Left">
            <Button
              size="small"
              type={textAlign === 'left' ? 'primary' : 'default'}
              icon={<AlignLeftOutlined />}
              onClick={() => {
                setTextAlign('left');
                updateObject({ textAlign: 'left' });
              }}
            />
          </Tooltip>
          <Tooltip title="Align Center">
            <Button
              size="small"
              type={textAlign === 'center' ? 'primary' : 'default'}
              icon={<AlignCenterOutlined />}
              onClick={() => {
                setTextAlign('center');
                updateObject({ textAlign: 'center' });
              }}
            />
          </Tooltip>
          <Tooltip title="Align Right">
            <Button
              size="small"
              type={textAlign === 'right' ? 'primary' : 'default'}
              icon={<AlignRightOutlined />}
              onClick={() => {
                setTextAlign('right');
                updateObject({ textAlign: 'right' });
              }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Line Height */}
      <PropertyRow label="Line Height" inline>
        <InputNumber
          size="small"
          value={lineHeight}
          onChange={(v) => {
            if (v) {
              setLineHeight(v);
              updateObject({ lineHeight: v });
            }
          }}
          min={0.5}
          max={3}
          step={0.1}
          style={{ width: 80 }}
        />
      </PropertyRow>

      {/* Character Spacing */}
      <PropertyRow label="Letter Spacing" inline>
        <InputNumber
          size="small"
          value={charSpacing}
          onChange={(v) => {
            if (v !== null) {
              setCharSpacing(v);
              updateObject({ charSpacing: v });
            }
          }}
          min={-100}
          max={500}
          style={{ width: 80 }}
        />
      </PropertyRow>
    </PropertySection>
  );
}
