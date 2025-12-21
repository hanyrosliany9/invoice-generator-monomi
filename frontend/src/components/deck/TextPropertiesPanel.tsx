import { useState, useEffect } from 'react';
import { Select, ColorPicker, InputNumber, Space, Typography, Divider, Button } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from '@ant-design/icons';
import { IText } from 'fabric';

const { Text } = Typography;

interface TextPropertiesPanelProps {
  textObject: IText;
  onChange: (property: string, value: any) => void;
}

const fontFamilies = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: 'Open Sans, sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display, serif' },
];

export default function TextPropertiesPanel({ textObject, onChange }: TextPropertiesPanelProps) {
  const [fontSize, setFontSize] = useState(textObject.fontSize || 24);
  const [fontFamily, setFontFamily] = useState(textObject.fontFamily || 'Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState(textObject.fontWeight || 'normal');
  const [fontStyle, setFontStyle] = useState(textObject.fontStyle || 'normal');
  const [underline, setUnderline] = useState(textObject.underline || false);
  const [fill, setFill] = useState((textObject.fill as string) || '#000000');
  const [textAlign, setTextAlign] = useState(textObject.textAlign || 'left');

  useEffect(() => {
    setFontSize(textObject.fontSize || 24);
    setFontFamily(textObject.fontFamily || 'Inter, sans-serif');
    setFontWeight(textObject.fontWeight || 'normal');
    setFontStyle(textObject.fontStyle || 'normal');
    setUnderline(textObject.underline || false);
    setFill((textObject.fill as string) || '#000000');
    setTextAlign(textObject.textAlign || 'left');
  }, [textObject]);

  const handleChange = (prop: string, value: any) => {
    switch (prop) {
      case 'fontSize':
        setFontSize(value);
        break;
      case 'fontFamily':
        setFontFamily(value);
        break;
      case 'fontWeight':
        setFontWeight(value);
        break;
      case 'fontStyle':
        setFontStyle(value);
        break;
      case 'underline':
        setUnderline(value);
        break;
      case 'fill':
        setFill(value);
        break;
      case 'textAlign':
        setTextAlign(value);
        break;
    }
    onChange(prop, value);
  };

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: 12 }}>
        Text Properties
      </Text>

      {/* Font Family */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Font
        </Text>
        <Select
          style={{ width: '100%' }}
          value={fontFamily}
          onChange={(val) => handleChange('fontFamily', val)}
          options={fontFamilies}
        />
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Size
        </Text>
        <InputNumber
          style={{ width: '100%' }}
          min={8}
          max={200}
          value={fontSize}
          onChange={(val) => handleChange('fontSize', val)}
          addonAfter="px"
        />
      </div>

      {/* Text Style */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Style
        </Text>
        <Space>
          <Button
            size="small"
            type={fontWeight === 'bold' ? 'primary' : 'default'}
            icon={<BoldOutlined />}
            onClick={() => handleChange('fontWeight', fontWeight === 'bold' ? 'normal' : 'bold')}
          />
          <Button
            size="small"
            type={fontStyle === 'italic' ? 'primary' : 'default'}
            icon={<ItalicOutlined />}
            onClick={() => handleChange('fontStyle', fontStyle === 'italic' ? 'normal' : 'italic')}
          />
          <Button
            size="small"
            type={underline ? 'primary' : 'default'}
            icon={<UnderlineOutlined />}
            onClick={() => handleChange('underline', !underline)}
          />
        </Space>
      </div>

      {/* Text Color */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Color
        </Text>
        <ColorPicker
          value={fill}
          onChange={(color) => handleChange('fill', color.toHexString())}
          showText
        />
      </div>

      {/* Text Alignment */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          Alignment
        </Text>
        <Space>
          <Button
            size="small"
            type={textAlign === 'left' ? 'primary' : 'default'}
            icon={<AlignLeftOutlined />}
            onClick={() => handleChange('textAlign', 'left')}
          />
          <Button
            size="small"
            type={textAlign === 'center' ? 'primary' : 'default'}
            icon={<AlignCenterOutlined />}
            onClick={() => handleChange('textAlign', 'center')}
          />
          <Button
            size="small"
            type={textAlign === 'right' ? 'primary' : 'default'}
            icon={<AlignRightOutlined />}
            onClick={() => handleChange('textAlign', 'right')}
          />
        </Space>
      </div>
    </div>
  );
}
