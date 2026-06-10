import { useEffect, useMemo, useRef, useState, createElement } from 'react';
import { Input, ColorPicker, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { renderToStaticMarkup } from 'react-dom/server';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../theme';

/* ------------------------------------------------------------------ */
/* ICON PICKER                                                          */
/*                                                                      */
/* Searchable grid over lucide-react, rendered as an inline popover     */
/* panel (the insert toolbar mounts it conditionally below the Icon     */
/* button). On pick, the chosen icon is serialized to a standalone      */
/* <svg> string via renderToStaticMarkup so it can be stored as ICON    */
/* content.svg and rendered identically everywhere (canvas/present/pdf)  */
/* without a runtime lucide dependency.                                  */
/* ------------------------------------------------------------------ */

export interface PickedIcon {
  svg: string;
  name: string;
  color: string;
}

interface IconPickerProps {
  /** Called with the chosen icon's serialized SVG (+ name/color). */
  onSelect: (icon: PickedIcon) => void;
  /** Close the popover (also fired after a successful pick). */
  onClose: () => void;
  /** Initial stroke color for the previewed/serialized icons. */
  initialColor?: string;
}

type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

// Build the icon catalogue once: PascalCase exports that are real components,
// excluding the `*Icon` aliases and the helper exports.
const ICON_ENTRIES: { name: string; Comp: IconComponent }[] = Object.entries(
  LucideIcons as Record<string, unknown>,
)
  .filter(([name, val]) => {
    if (!/^[A-Z]/.test(name)) return false;
    if (name.endsWith('Icon')) return false; // alias duplicates
    if (name === 'LucideIcon' || name === 'Icon') return false;
    return typeof val === 'object' || typeof val === 'function';
  })
  .map(([name, Comp]) => ({ name, Comp: Comp as IconComponent }));

const MAX_RENDER = 240; // cap rendered tiles for perf; search narrows further

// Serialize a lucide icon component to a standalone <svg> string.
export const serializeLucideIcon = (Comp: IconComponent, color: string): string =>
  renderToStaticMarkup(createElement(Comp, { color, size: 24, strokeWidth: 2 }));

export default function IconPicker({ onSelect, onClose, initialColor = '#111827' }: IconPickerProps) {
  const { theme: themeConfig } = useTheme();
  const [query, setQuery] = useState('');
  const [color, setColor] = useState(initialColor);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q ? ICON_ENTRIES.filter((e) => e.name.toLowerCase().includes(q)) : ICON_ENTRIES;
    return source.slice(0, MAX_RENDER);
  }, [query]);

  const handlePick = (entry: { name: string; Comp: IconComponent }) => {
    const svg = serializeLucideIcon(entry.Comp, color);
    onSelect({ svg, name: entry.name, color });
    onClose();
  };

  return (
    <div
      ref={rootRef}
      style={{
        width: 360,
        background: themeConfig.colors.background.primary,
        border: `1px solid ${themeConfig.colors.border.light}`,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        padding: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <Input
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="Search icons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <ColorPicker
          size="small"
          value={color}
          onChange={(c) => setColor(c.toHexString())}
          showText={false}
        />
      </div>

      {filtered.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No icons match" style={{ padding: 24 }} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {filtered.map(({ name, Comp }) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => handlePick({ name, Comp })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                aspectRatio: '1 / 1',
                border: `1px solid ${themeConfig.colors.border.light}`,
                borderRadius: 6,
                background: themeConfig.colors.background.primary,
                cursor: 'pointer',
                color,
                padding: 6,
              }}
            >
              <Comp color={color} size={20} strokeWidth={2} />
            </button>
          ))}
        </div>
      )}

      {query.trim() === '' && ICON_ENTRIES.length > MAX_RENDER && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: themeConfig.colors.text.secondary,
            textAlign: 'center',
          }}
        >
          Showing {MAX_RENDER} of {ICON_ENTRIES.length} — type to search the rest.
        </div>
      )}
    </div>
  );
}
