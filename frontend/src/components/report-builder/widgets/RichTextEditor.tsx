import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { createEditor, Descendant, Editor, Transforms, Element as SlateElement, BaseEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor, RenderElementProps, RenderLeafProps, useSlateStatic } from 'slate-react';
import { withHistory, HistoryEditor } from 'slate-history';
import { Button, Space, theme, Divider } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

// Extend Slate types
type CustomElement = {
  type: 'paragraph' | 'heading-one' | 'heading-two' | 'heading-three' | 'bulleted-list' | 'numbered-list' | 'list-item';
  align?: 'left' | 'center' | 'right';
  children: CustomText[];
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const HOTKEYS: Record<string, string> = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
};

interface RichTextEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  placeholder?: string;
  readonly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start typing...',
  readonly = false,
}) => {
  const { token } = useToken();
  const [editor] = useState(() => withHistory(withReact(createEditor())));
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState<Descendant[]>(value);

  // Update internal value when prop changes externally
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const renderElement = useCallback((props: RenderElementProps) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);

  const toggleMark = (format: string) => {
    const isActive = isMarkActive(editor, format);
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  const toggleBlock = (format: string) => {
    const isActive = isBlockActive(editor, format);
    const isList = ['numbered-list', 'bulleted-list'].includes(format);

    Transforms.unwrapNodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        ['numbered-list', 'bulleted-list'].includes(n.type),
      split: true,
    });

    const newProperties: Partial<SlateElement> = {
      type: (isActive ? 'paragraph' : isList ? 'list-item' : format) as any,
    };
    Transforms.setNodes<SlateElement>(editor, newProperties);

    if (!isActive && isList) {
      const block = { type: format as any, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    Transforms.setNodes<SlateElement>(
      editor,
      { align },
      { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
    );
  };

  const handleChange = useCallback((newValue: Descendant[]) => {
    setInternalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  return (
    <div
      onClick={(e) => {
        // Prevent widget selection when clicking inside editor
        e.stopPropagation();
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Slate editor={editor} initialValue={internalValue} onChange={handleChange}>
        {!readonly && (
          <>
            <div
              style={{
                padding: `${token.paddingXS}px 0 ${token.paddingXS}px`,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                marginBottom: token.paddingXS,
                flexShrink: 0,
              }}
            >
              <Space wrap size="small">
                {/* Text formatting */}
                <MarkButton format="bold" icon={<BoldOutlined />} />
                <MarkButton format="italic" icon={<ItalicOutlined />} />
                <MarkButton format="underline" icon={<UnderlineOutlined />} />

                <Divider type="vertical" style={{ margin: '0 4px' }} />

                {/* Headings */}
                <BlockButton format="heading-one" label="H1" />
                <BlockButton format="heading-two" label="H2" />
                <BlockButton format="heading-three" label="H3" />

                <Divider type="vertical" style={{ margin: '0 4px' }} />

                {/* Lists */}
                <BlockButton format="bulleted-list" icon={<UnorderedListOutlined />} />
                <BlockButton format="numbered-list" icon={<OrderedListOutlined />} />

                <Divider type="vertical" style={{ margin: '0 4px' }} />

                {/* Alignment */}
                <AlignButton align="left" icon={<AlignLeftOutlined />} />
                <AlignButton align="center" icon={<AlignCenterOutlined />} />
                <AlignButton align="right" icon={<AlignRightOutlined />} />
              </Space>
            </div>
          </>
        )}
        <Editable
          readOnly={readonly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={placeholder}
          spellCheck
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event as any)) {
                event.preventDefault();
                const mark = HOTKEYS[hotkey];
                toggleMark(mark);
              }
            }
          }}
          style={{
            padding: 0,
            flex: 1,
            overflowY: 'auto',
            fontSize: 14,
            lineHeight: 1.6,
            cursor: 'text',
            outline: 'none',
          }}
        />
      </Slate>
    </div>
  );
};

// Helper components
const MarkButton = ({ format, icon }: { format: string; icon: React.ReactNode }) => {
  const editor = useSlateStatic() as Editor;
  const isActive = isMarkActive(editor, format);

  return (
    <Button
      type={isActive ? 'primary' : 'text'}
      size="small"
      icon={icon}
      onMouseDown={(event) => {
        event.preventDefault();
        if (format === 'bold') {
          const isActive = isMarkActive(editor, 'bold');
          if (isActive) {
            Editor.removeMark(editor, 'bold');
          } else {
            Editor.addMark(editor, 'bold', true);
          }
        } else if (format === 'italic') {
          const isActive = isMarkActive(editor, 'italic');
          if (isActive) {
            Editor.removeMark(editor, 'italic');
          } else {
            Editor.addMark(editor, 'italic', true);
          }
        } else if (format === 'underline') {
          const isActive = isMarkActive(editor, 'underline');
          if (isActive) {
            Editor.removeMark(editor, 'underline');
          } else {
            Editor.addMark(editor, 'underline', true);
          }
        }
      }}
    />
  );
};

const BlockButton = ({ format, icon, label }: { format: string; icon?: React.ReactNode; label?: string }) => {
  const editor = useSlateStatic() as Editor;
  const isActive = isBlockActive(editor, format);

  return (
    <Button
      type={isActive ? 'primary' : 'text'}
      size="small"
      icon={icon}
      onMouseDown={(event) => {
        event.preventDefault();
        const isList = ['numbered-list', 'bulleted-list'].includes(format);

        Transforms.unwrapNodes(editor, {
          match: (n) =>
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            ['numbered-list', 'bulleted-list'].includes(n.type),
          split: true,
        });

        const newProperties: Partial<SlateElement> = {
          type: (isActive ? 'paragraph' : isList ? 'list-item' : format) as any,
        };
        Transforms.setNodes<SlateElement>(editor, newProperties);

        if (!isActive && isList) {
          const block = { type: format as any, children: [] };
          Transforms.wrapNodes(editor, block);
        }
      }}
    >
      {label}
    </Button>
  );
};

const AlignButton = ({ align, icon }: { align: 'left' | 'center' | 'right'; icon: React.ReactNode }) => {
  const editor = useSlateStatic() as Editor;

  return (
    <Button
      type="text"
      size="small"
      icon={icon}
      onMouseDown={(event) => {
        event.preventDefault();
        Transforms.setNodes<SlateElement>(
          editor,
          { align },
          { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
        );
      }}
    />
  );
};

// Render element
const Element = ({ attributes, children, element }: RenderElementProps) => {
  const style: React.CSSProperties = { textAlign: (element as any).align || 'left' };

  switch (element.type) {
    case 'heading-one':
      return (
        <h1 style={{ ...style, fontSize: 28, fontWeight: 700, marginBottom: 16 }} {...attributes}>
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 style={{ ...style, fontSize: 22, fontWeight: 600, marginBottom: 12 }} {...attributes}>
          {children}
        </h2>
      );
    case 'heading-three':
      return (
        <h3 style={{ ...style, fontSize: 18, fontWeight: 600, marginBottom: 8 }} {...attributes}>
          {children}
        </h3>
      );
    case 'bulleted-list':
      return (
        <ul style={{ ...style, paddingLeft: 24, marginBottom: 8 }} {...attributes}>
          {children}
        </ul>
      );
    case 'numbered-list':
      return (
        <ol style={{ ...style, paddingLeft: 24, marginBottom: 8 }} {...attributes}>
          {children}
        </ol>
      );
    case 'list-item':
      return (
        <li style={{ ...style, marginBottom: 4 }} {...attributes}>
          {children}
        </li>
      );
    default:
      return (
        <p style={{ ...style, marginBottom: 8 }} {...attributes}>
          {children}
        </p>
      );
  }
};

// Render leaf
const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  const customLeaf = leaf as CustomText;

  if (customLeaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (customLeaf.italic) {
    children = <em>{children}</em>;
  }

  if (customLeaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

// Helper functions
const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

const isBlockActive = (editor: Editor, format: string) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
    })
  );

  return !!match;
};

const isHotkey = (hotkey: string, event: { key: string; metaKey: boolean; ctrlKey: boolean }) => {
  const keys = hotkey.split('+');
  const key = keys[keys.length - 1];
  const isMod = keys.includes('mod');

  if (event.key.toLowerCase() !== key.toLowerCase()) return false;
  if (isMod && !(event.metaKey || event.ctrlKey)) return false;

  return true;
};

export default RichTextEditor;
