import React, { useState, useCallback, useMemo } from 'react';
import { Descendant } from 'slate';
import { theme } from 'antd';
import { TextWidget as TextWidgetType } from '../../../types/report-builder';
import RichTextEditor from './RichTextEditor';

const { useToken } = theme;

interface TextWidgetProps {
  widget: TextWidgetType;
  onChange: (updates: Partial<TextWidgetType>) => void;
  readonly: boolean;
}

// Default initial value for empty editor
const INITIAL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  } as any,
];

// Serialize Slate value to plain text for PDF
const serializeToPlainText = (nodes: Descendant[]): string => {
  return nodes.map((n: any) => {
    if (n.children) {
      return serializeToPlainText(n.children);
    }
    return n.text || '';
  }).join('\n');
};

// Serialize Slate value to HTML for readonly display
const serializeToHTML = (nodes: Descendant[]): string => {
  return nodes.map((n: any) => {
    const align = n.align ? ` style="text-align: ${n.align};"` : '';

    let children = '';
    if (n.children) {
      children = n.children.map((child: any) => {
        let text = child.text || '';
        if (child.bold) text = `<strong>${text}</strong>`;
        if (child.italic) text = `<em>${text}</em>`;
        if (child.underline) text = `<u>${text}</u>`;
        return text;
      }).join('');
    }

    switch (n.type) {
      case 'heading-one':
        return `<h1${align}>${children}</h1>`;
      case 'heading-two':
        return `<h2${align}>${children}</h2>`;
      case 'heading-three':
        return `<h3${align}>${children}</h3>`;
      case 'bulleted-list':
        return `<ul${align}>${children}</ul>`;
      case 'numbered-list':
        return `<ol${align}>${children}</ol>`;
      case 'list-item':
        return `<li>${children}</li>`;
      default:
        return `<p${align}>${children}</p>`;
    }
  }).join('');
};

export const TextWidget: React.FC<TextWidgetProps> = ({ widget, onChange, readonly }) => {
  const { token } = useToken();

  // Parse content (could be string or Slate value)
  const parsedValue = useMemo(() => {
    const content = widget.config.content;

    // If it's already a Slate value (array of nodes), use it
    if (Array.isArray(content)) {
      return content as Descendant[];
    }

    // If it's a string, convert to initial Slate value
    if (typeof content === 'string' && content.trim()) {
      return [
        {
          type: 'paragraph',
          children: [{ text: content }],
        } as any,
      ];
    }

    return INITIAL_VALUE;
  }, [widget.config.content]);

  const handleChange = useCallback(
    (value: Descendant[]) => {
      onChange({
        config: {
          ...widget.config,
          content: value, // Store Slate value directly
          plainText: serializeToPlainText(value), // For PDF generation
        },
      });
    },
    [widget.config, onChange]
  );

  if (readonly) {
    // Render HTML in readonly mode
    const html = serializeToHTML(parsedValue);

    return (
      <div
        style={{
          fontSize: widget.config.fontSize || 14,
          color: token.colorText,
          lineHeight: 1.6,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <RichTextEditor
      value={parsedValue}
      onChange={handleChange}
      placeholder="Start typing... (Use toolbar for formatting)"
      readonly={readonly}
    />
  );
};

export default TextWidget;
