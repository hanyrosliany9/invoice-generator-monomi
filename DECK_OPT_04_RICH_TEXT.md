# Phase 4: Rich Text Editor with Tiptap

> **File**: `DECK_OPT_04_RICH_TEXT.md`
> **Executor**: Haiku 4.5
> **Prerequisites**: `DECK_OPT_03_CANVAS_CONTROLS.md` completed
> **Estimated Steps**: 5

## Objective

Implement rich text editing with bold, italic, underline, lists, and alignment using Tiptap.

---

## Step 1: Install Tiptap Dependencies

Run on HOST machine:

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-font-family @tiptap/extension-highlight
```

---

## Step 2: Create Rich Text Editor Component

**File**: `frontend/src/components/deck/RichTextEditor.tsx`

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { Button, Space, Tooltip, Select, ColorPicker, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  HighlightOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onClose?: () => void;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

const fontFamilies = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

export default function RichTextEditor({
  content,
  onChange,
  onClose,
  fontSize = 16,
  fontFamily = 'Inter, sans-serif',
  color = '#000000',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // We'll handle headings via font size
      }),
      TextAlign.configure({
        types: ['paragraph'],
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content || '<p>Enter text...</p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `font-size: ${fontSize}px; font-family: ${fontFamily}; color: ${color}; outline: none; min-height: 100px; padding: 8px;`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  const ToolbarButton = ({
    icon,
    isActive,
    onClick,
    title,
  }: {
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    title: string;
  }) => (
    <Tooltip title={title}>
      <Button
        size="small"
        type={isActive ? 'primary' : 'default'}
        icon={icon}
        onClick={onClick}
      />
    </Tooltip>
  );

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px',
          borderBottom: '1px solid #d9d9d9',
          background: '#fafafa',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Select
          size="small"
          style={{ width: 120 }}
          value={fontFamily}
          options={fontFamilies}
          onChange={(val) => editor.chain().focus().setFontFamily(val).run()}
        />

        <Select
          size="small"
          style={{ width: 70 }}
          value={fontSize}
          options={fontSizes.map((s) => ({ label: `${s}`, value: s }))}
          onChange={(val) => {
            // Font size requires custom extension - for now set via style
            const element = document.querySelector('.ProseMirror');
            if (element) {
              (element as HTMLElement).style.fontSize = `${val}px`;
            }
          }}
        />

        <Divider type="vertical" />

        <ToolbarButton
          icon={<BoldOutlined />}
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        />
        <ToolbarButton
          icon={<ItalicOutlined />}
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        />
        <ToolbarButton
          icon={<UnderlineOutlined />}
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        />
        <ToolbarButton
          icon={<StrikethroughOutlined />}
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        />

        <Divider type="vertical" />

        <ColorPicker
          size="small"
          value={color}
          onChange={(c) => editor.chain().focus().setColor(c.toHexString()).run()}
        />

        <ColorPicker
          size="small"
          value="#ffff00"
          onChange={(c) =>
            editor.chain().focus().toggleHighlight({ color: c.toHexString() }).run()
          }
        >
          <Button size="small" icon={<HighlightOutlined />} />
        </ColorPicker>

        <Divider type="vertical" />

        <ToolbarButton
          icon={<AlignLeftOutlined />}
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align Left"
        />
        <ToolbarButton
          icon={<AlignCenterOutlined />}
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align Center"
        />
        <ToolbarButton
          icon={<AlignRightOutlined />}
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align Right"
        />

        <Divider type="vertical" />

        <ToolbarButton
          icon={<UnorderedListOutlined />}
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        />
        <ToolbarButton
          icon={<OrderedListOutlined />}
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        />
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{
          minHeight: 100,
          background: '#fff',
        }}
      />
    </div>
  );
}
```

---

## Step 3: Create Text Properties Panel

**File**: `frontend/src/components/deck/TextPropertiesPanel.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Select, ColorPicker, InputNumber, Space, Typography, Divider, Switch } from 'antd';
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
          <Switch
            checkedChildren={<BoldOutlined />}
            unCheckedChildren={<BoldOutlined />}
            checked={fontWeight === 'bold'}
            onChange={(checked) => handleChange('fontWeight', checked ? 'bold' : 'normal')}
          />
          <Switch
            checkedChildren={<ItalicOutlined />}
            unCheckedChildren={<ItalicOutlined />}
            checked={fontStyle === 'italic'}
            onChange={(checked) => handleChange('fontStyle', checked ? 'italic' : 'normal')}
          />
          <Switch
            checkedChildren={<UnderlineOutlined />}
            unCheckedChildren={<UnderlineOutlined />}
            checked={underline}
            onChange={(checked) => handleChange('underline', checked)}
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
          <Switch
            checkedChildren={<AlignLeftOutlined />}
            unCheckedChildren={<AlignLeftOutlined />}
            checked={textAlign === 'left'}
            onChange={() => handleChange('textAlign', 'left')}
          />
          <Switch
            checkedChildren={<AlignCenterOutlined />}
            unCheckedChildren={<AlignCenterOutlined />}
            checked={textAlign === 'center'}
            onChange={() => handleChange('textAlign', 'center')}
          />
          <Switch
            checkedChildren={<AlignRightOutlined />}
            unCheckedChildren={<AlignRightOutlined />}
            checked={textAlign === 'right'}
            onChange={() => handleChange('textAlign', 'right')}
          />
        </Space>
      </div>
    </div>
  );
}
```

---

## Step 4: Create Inline Text Editor Overlay

**File**: `frontend/src/components/deck/InlineTextEditor.tsx`

```typescript
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
    // Focus and select all text
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
```

---

## Step 5: Update DeckCanvas for Text Editing

Update `frontend/src/components/deck/DeckCanvas.tsx` to handle text editing events:

Add to the canvas initialization (inside useEffect):

```typescript
// Double-click to edit text
canvas.on('mouse:dblclick', (e) => {
  const target = e.target;
  if (target && target.get('elementType') === 'TEXT') {
    // Fabric IText handles its own editing
    // This event can be used for additional UI if needed
  }
});

// Text editing events
canvas.on('text:editing:entered', () => {
  // Disable canvas selection while editing text
  canvas.selection = false;
});

canvas.on('text:editing:exited', () => {
  canvas.selection = true;
  // Save history when done editing
  pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
});
```

---

## Add CSS for Tiptap

**File**: `frontend/src/styles/tiptap.css`

```css
/* Tiptap Editor Styles */
.ProseMirror {
  outline: none;
  min-height: 100px;
  padding: 8px;
}

.ProseMirror p {
  margin: 0 0 0.5em 0;
}

.ProseMirror p:last-child {
  margin-bottom: 0;
}

.ProseMirror ul,
.ProseMirror ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.ProseMirror li {
  margin: 0.25em 0;
}

.ProseMirror mark {
  padding: 0.125em 0.25em;
  border-radius: 0.25em;
}

/* Selection highlight */
.ProseMirror ::selection {
  background: #b3d4fc;
}

/* Placeholder */
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}
```

Import in `frontend/src/App.tsx` or `frontend/src/pages/DeckEditorPage.tsx`:

```typescript
import '../styles/tiptap.css';
```

---

## Completion Checklist

- [ ] Tiptap dependencies installed
- [ ] `RichTextEditor.tsx` component created
- [ ] `TextPropertiesPanel.tsx` component created
- [ ] `InlineTextEditor.tsx` component created
- [ ] DeckCanvas handles text editing events
- [ ] CSS styles added for Tiptap
- [ ] Bold/italic/underline work
- [ ] Text alignment works
- [ ] Font family selection works
- [ ] Color picker works

---

## Next File

After completing this file, proceed to: `DECK_OPT_05_SHAPE_LIBRARY.md`
