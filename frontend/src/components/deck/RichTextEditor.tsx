import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { Button, Space, Tooltip, Select, ColorPicker, Divider } from 'antd';
import { useTheme } from '../../theme';
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
  const { theme: themeConfig } = useTheme();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
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
  }, [content, editor]);

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
    <div style={{ border: `1px solid ${themeConfig.colors.border.default}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px',
          borderBottom: `1px solid ${themeConfig.colors.border.default}`,
          background: themeConfig.colors.background.secondary,
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
          value={color}
          onChange={(c) => editor.chain().focus().setColor(c.toHexString()).run()}
          showText
        />

        <Tooltip title="Highlight">
          <ColorPicker
            value="#ffff00"
            onChange={(c) =>
              editor.chain().focus().toggleHighlight({ color: c.toHexString() }).run()
            }
          >
            <Button size="small" icon={<HighlightOutlined />} />
          </ColorPicker>
        </Tooltip>

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
          background: themeConfig.colors.background.primary,
        }}
      />
    </div>
  );
}
