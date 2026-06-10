import { useEffect, useState } from 'react';
import { Select, InputNumber, ColorPicker, Space, Button, Tooltip, Input } from 'antd';
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  HighlightOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  ColumnHeightOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { IText } from 'fabric';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { DECK_TOJSON_PROPS } from '../../../utils/deckCanvasUtils';

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
  const [linethrough, setLinethrough] = useState(false);
  const [textAlign, setTextAlign] = useState<string>('left');
  const [fill, setFill] = useState<string>('#1f2937');
  const [highlight, setHighlight] = useState<string>('#ffff00');
  const [hasHighlight, setHasHighlight] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.16);
  const [charSpacing, setCharSpacing] = useState(0);
  const [spaceBefore, setSpaceBefore] = useState(0);
  const [spaceAfter, setSpaceAfter] = useState(0);
  const [listType, setListType] = useState<'none' | 'bullet' | 'numbered'>('none');
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'middle' | 'bottom'>('top');
  const [autofit, setAutofit] = useState(false);
  const [link, setLink] = useState<string>('');

  // Sync with object
  useEffect(() => {
    if (!object) return;
    const o = object as any;

    setFontFamily(object.fontFamily || 'Inter, sans-serif');
    setFontSize((object.fontSize || 24) as number);
    setFontWeight((object.fontWeight as string) || 'normal');
    setFontStyle(object.fontStyle || 'normal');
    setUnderline(object.underline || false);
    setLinethrough(object.linethrough || false);
    setTextAlign(object.textAlign || 'left');
    setFill((object.fill as string) || '#1f2937');
    const tbg = o.textBackgroundColor as string;
    setHasHighlight(!!tbg && tbg !== 'transparent');
    setHighlight(tbg && tbg !== 'transparent' ? tbg : '#ffff00');
    setLineHeight((object.lineHeight || 1.16) as number);
    setCharSpacing((object.charSpacing || 0) as number);
    setSpaceBefore((o.spaceBefore || 0) as number);
    setSpaceAfter((o.spaceAfter || 0) as number);
    setListType((o.listType as any) || 'none');
    setVerticalAlign((o.verticalAlign as any) || 'top');
    setAutofit(!!o.autofit);
    setLink((o.link as string) || '');
  }, [object]);

  // True when the IText is actively being edited with a non-empty selection.
  const hasRangeSelection = (): boolean => {
    const o = object as any;
    return (
      !!o.isEditing &&
      typeof o.selectionStart === 'number' &&
      typeof o.selectionEnd === 'number' &&
      o.selectionStart !== o.selectionEnd
    );
  };

  // Push history + trigger autosave. Prefer firing object:modified so the new
  // mutation goes through the canvas autosave path (per project conventions),
  // but also pushHistory with our extended prop list so bespoke props undo too.
  const persist = () => {
    if (!canvas || !object) return;
    canvas.renderAll();
    pushHistory(JSON.stringify((canvas as any).toJSON(DECK_TOJSON_PROPS)));
    canvas.fire('object:modified', { target: object });
  };

  // Apply a whole-object change.
  const updateObject = (changes: Record<string, any>) => {
    if (!object || !canvas) return;
    object.set(changes);
    persist();
  };

  // Apply formatting either to the active selection range (when editing) or to
  // the whole object. `selectionStyles` maps to setSelectionStyles, `whole`
  // maps to object.set — pass the equivalent of each.
  const applyStyle = (selectionStyles: Record<string, any>, whole: Record<string, any>) => {
    if (!object || !canvas) return;
    const o = object as any;
    if (hasRangeSelection()) {
      o.setSelectionStyles(selectionStyles, o.selectionStart, o.selectionEnd);
    } else {
      object.set(whole);
    }
    persist();
  };

  /* ----------------------------- list helpers ----------------------------- */
  const stripListPrefix = (line: string): string =>
    line.replace(/^\s*(?:[•\-*]\s+|\d+\.\s+)/, '');

  const applyList = (target: 'none' | 'bullet' | 'numbered') => {
    if (!object) return;
    const o = object as any;
    const lines = (object.text || '').split('\n');
    const stripped = lines.map(stripListPrefix);
    let next: string[];
    if (target === 'bullet') {
      next = stripped.map((l) => (l.length ? `• ${l}` : l));
    } else if (target === 'numbered') {
      let n = 0;
      next = stripped.map((l) => {
        if (!l.length) return l;
        n += 1;
        return `${n}. ${l}`;
      });
    } else {
      next = stripped;
    }
    o.listType = target === 'none' ? undefined : target;
    setListType(target);
    object.set('text', next.join('\n'));
    persist();
  };

  const toggleList = (kind: 'bullet' | 'numbered') => {
    applyList(listType === kind ? 'none' : kind);
  };

  /* -------------------------- vertical align ------------------------------ */
  // Stored as content.verticalAlign; applied on load + export. In-editor we
  // nudge the object's top within a notional box is non-trivial for IText, so
  // MVP persists the intent (round-trips) and the export honours it.
  const applyVerticalAlign = (v: 'top' | 'middle' | 'bottom') => {
    if (!object) return;
    (object as any).verticalAlign = v;
    setVerticalAlign(v);
    persist();
  };

  /* ------------------------------- autofit -------------------------------- */
  const computeAutofit = () => {
    if (!object) return;
    const o = object as any;
    // Shrink fontSize until the rendered text height fits the object's box.
    const box = (object.height || 0) * (object.scaleY || 1);
    if (box <= 0) return;
    let size = object.fontSize || 24;
    let guard = 0;
    while (size > 6 && guard < 200) {
      object.set('fontSize', size);
      object.initDimensions?.();
      if ((object.height || 0) <= box / (object.scaleY || 1)) break;
      size -= 1;
      guard += 1;
    }
    setFontSize(size);
    persist();
    o.autofit && computeAutofitMarker();
  };
  // No-op marker kept for clarity; autofit flag drives recompute on edit elsewhere.
  const computeAutofitMarker = () => {};

  const toggleAutofit = () => {
    if (!object) return;
    const next = !autofit;
    (object as any).autofit = next;
    setAutofit(next);
    if (next) computeAutofit();
    else persist();
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
              applyStyle({ fontSize: v }, { fontSize: v });
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
            applyStyle({ fill: hex }, { fill: hex });
          }}
          showText
        />
      </PropertyRow>

      {/* Highlight */}
      <PropertyRow label="Highlight" inline>
        <Space size={4}>
          <Tooltip title={hasHighlight ? 'Remove highlight' : 'Add highlight'}>
            <Button
              size="small"
              type={hasHighlight ? 'primary' : 'default'}
              icon={<HighlightOutlined />}
              onClick={() => {
                if (hasHighlight) {
                  setHasHighlight(false);
                  applyStyle({ textBackgroundColor: '' }, { textBackgroundColor: '' });
                } else {
                  setHasHighlight(true);
                  applyStyle(
                    { textBackgroundColor: highlight },
                    { textBackgroundColor: highlight }
                  );
                }
              }}
            />
          </Tooltip>
          <ColorPicker
            value={highlight}
            onChange={(color) => {
              const hex = color.toHexString();
              setHighlight(hex);
              setHasHighlight(true);
              applyStyle({ textBackgroundColor: hex }, { textBackgroundColor: hex });
            }}
          />
        </Space>
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
                applyStyle({ fontWeight: newWeight }, { fontWeight: newWeight });
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
                applyStyle({ fontStyle: newStyle }, { fontStyle: newStyle });
              }}
            />
          </Tooltip>
          <Tooltip title="Underline">
            <Button
              size="small"
              type={underline ? 'primary' : 'default'}
              icon={<UnderlineOutlined />}
              onClick={() => {
                const next = !underline;
                setUnderline(next);
                applyStyle({ underline: next }, { underline: next });
              }}
            />
          </Tooltip>
          <Tooltip title="Strikethrough">
            <Button
              size="small"
              type={linethrough ? 'primary' : 'default'}
              icon={<StrikethroughOutlined />}
              onClick={() => {
                const next = !linethrough;
                setLinethrough(next);
                applyStyle({ linethrough: next }, { linethrough: next });
              }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Lists */}
      <PropertyRow label="List">
        <Space size={4}>
          <Tooltip title="Bullet list">
            <Button
              size="small"
              type={listType === 'bullet' ? 'primary' : 'default'}
              icon={<UnorderedListOutlined />}
              onClick={() => toggleList('bullet')}
            />
          </Tooltip>
          <Tooltip title="Numbered list">
            <Button
              size="small"
              type={listType === 'numbered' ? 'primary' : 'default'}
              icon={<OrderedListOutlined />}
              onClick={() => toggleList('numbered')}
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

      {/* Vertical Align */}
      <PropertyRow label="Vertical">
        <Space size={4}>
          <Tooltip title="Top">
            <Button
              size="small"
              type={verticalAlign === 'top' ? 'primary' : 'default'}
              icon={<VerticalAlignTopOutlined />}
              onClick={() => applyVerticalAlign('top')}
            />
          </Tooltip>
          <Tooltip title="Middle">
            <Button
              size="small"
              type={verticalAlign === 'middle' ? 'primary' : 'default'}
              icon={<VerticalAlignMiddleOutlined />}
              onClick={() => applyVerticalAlign('middle')}
            />
          </Tooltip>
          <Tooltip title="Bottom">
            <Button
              size="small"
              type={verticalAlign === 'bottom' ? 'primary' : 'default'}
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => applyVerticalAlign('bottom')}
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

      {/* Paragraph spacing (before / after) */}
      <PropertyRow label="Space ↑↓">
        <Space size={4}>
          <Tooltip title="Space before">
            <InputNumber
              size="small"
              value={spaceBefore}
              onChange={(v) => {
                const n = v ?? 0;
                setSpaceBefore(n);
                (object as any).spaceBefore = n;
                persist();
              }}
              min={0}
              max={200}
              prefix={<VerticalAlignTopOutlined />}
              style={{ width: 80 }}
            />
          </Tooltip>
          <Tooltip title="Space after">
            <InputNumber
              size="small"
              value={spaceAfter}
              onChange={(v) => {
                const n = v ?? 0;
                setSpaceAfter(n);
                (object as any).spaceAfter = n;
                persist();
              }}
              min={0}
              max={200}
              prefix={<VerticalAlignBottomOutlined />}
              style={{ width: 80 }}
            />
          </Tooltip>
        </Space>
      </PropertyRow>

      {/* Character Spacing */}
      <PropertyRow label="Letter Spacing" inline>
        <InputNumber
          size="small"
          value={charSpacing}
          onChange={(v) => {
            if (v !== null) {
              setCharSpacing(v);
              applyStyle({}, { charSpacing: v });
              // charSpacing is a whole-object prop in fabric; apply directly.
              object.set('charSpacing', v);
              persist();
            }
          }}
          min={-100}
          max={500}
          style={{ width: 80 }}
        />
      </PropertyRow>

      {/* Autofit */}
      <PropertyRow label="Autofit" inline>
        <Tooltip title="Shrink text to fit the box">
          <Button
            size="small"
            type={autofit ? 'primary' : 'default'}
            icon={<ColumnHeightOutlined />}
            onClick={toggleAutofit}
          >
            {autofit ? 'On' : 'Off'}
          </Button>
        </Tooltip>
      </PropertyRow>

      {/* Hyperlink */}
      <PropertyRow label="Link">
        <Input
          size="small"
          value={link}
          prefix={<LinkOutlined />}
          placeholder="https://…"
          allowClear
          onChange={(e) => setLink(e.target.value)}
          onBlur={() => {
            (object as any).link = link || undefined;
            persist();
          }}
          onPressEnter={() => {
            (object as any).link = link || undefined;
            persist();
          }}
        />
      </PropertyRow>
    </PropertySection>
  );
}
