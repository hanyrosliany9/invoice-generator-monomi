import { useCallback, useMemo } from 'react';
import { Button, InputNumber, Switch, ColorPicker, Input, Space, Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';
import type { FabricObject } from 'fabric';
import { useTheme } from '../../../theme';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { rebuildElementObject, type TableContent } from '../../../utils/deckCanvasUtils';

interface TablePropertiesProps {
  object: FabricObject;
}

const DEFAULT: TableContent = {
  rows: 3,
  cols: 3,
  cells: [
    ['Header 1', 'Header 2', 'Header 3'],
    ['', '', ''],
    ['', '', ''],
  ],
  headerRow: true,
  borderColor: '#d1d5db',
  headerBg: '#1e293b',
  textColor: '#111827',
  fontSize: 14,
};

// Normalize a cells grid to rows x cols, filling/truncating as needed.
const normalizeCells = (cells: string[][], rows: number, cols: number): string[][] => {
  const out: string[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(cells[r]?.[c] ?? '');
    }
    out.push(row);
  }
  return out;
};

export default function TableProperties({ object }: TablePropertiesProps) {
  const { theme: themeConfig } = useTheme();
  const { canvas } = useDeckCanvasStore();

  const content = useMemo<TableContent>(() => {
    const stored = (object as any).get?.('elementContent') as TableContent | undefined;
    return { ...DEFAULT, ...(stored || {}) };
  }, [object]);

  const apply = useCallback(
    (next: TableContent) => {
      if (!canvas) return;
      // keep rows/cols in sync with the grid then rebuild the on-canvas object
      const normalized: TableContent = {
        ...next,
        cells: normalizeCells(next.cells, next.rows, next.cols),
      };
      void rebuildElementObject(canvas, object, normalized);
    },
    [canvas, object],
  );

  const setRows = (rows: number) => {
    const r = Math.max(1, Math.min(20, rows || 1));
    apply({ ...content, rows: r });
  };
  const setCols = (cols: number) => {
    const c = Math.max(1, Math.min(12, cols || 1));
    apply({ ...content, cols: c });
  };

  const setCell = (r: number, c: number, value: string) => {
    const cells = normalizeCells(content.cells, content.rows, content.cols);
    cells[r][c] = value;
    apply({ ...content, cells });
  };

  const grid = normalizeCells(content.cells, content.rows, content.cols);

  return (
    <>
      <PropertySection title="Table">
        <PropertyRow label="Rows" inline>
          <Space.Compact>
            <Button
              size="small"
              icon={<MinusOutlined />}
              onClick={() => setRows(content.rows - 1)}
              disabled={content.rows <= 1}
            />
            <InputNumber
              size="small"
              min={1}
              max={20}
              value={content.rows}
              onChange={(v) => setRows(Number(v))}
              style={{ width: 56 }}
            />
            <Button size="small" icon={<PlusOutlined />} onClick={() => setRows(content.rows + 1)} />
          </Space.Compact>
        </PropertyRow>

        <PropertyRow label="Columns" inline>
          <Space.Compact>
            <Button
              size="small"
              icon={<MinusOutlined />}
              onClick={() => setCols(content.cols - 1)}
              disabled={content.cols <= 1}
            />
            <InputNumber
              size="small"
              min={1}
              max={12}
              value={content.cols}
              onChange={(v) => setCols(Number(v))}
              style={{ width: 56 }}
            />
            <Button size="small" icon={<PlusOutlined />} onClick={() => setCols(content.cols + 1)} />
          </Space.Compact>
        </PropertyRow>

        <PropertyRow label="Header row" inline>
          <Switch
            size="small"
            checked={content.headerRow}
            onChange={(v) => apply({ ...content, headerRow: v })}
          />
        </PropertyRow>

        <PropertyRow label="Font size" inline>
          <InputNumber
            size="small"
            min={6}
            max={72}
            value={content.fontSize}
            onChange={(v) => apply({ ...content, fontSize: Number(v) || 14 })}
            style={{ width: 64 }}
          />
        </PropertyRow>
      </PropertySection>

      <PropertySection title="Colors">
        <PropertyRow label="Border" inline>
          <ColorPicker
            value={content.borderColor}
            onChange={(c) => apply({ ...content, borderColor: c.toHexString() })}
            size="small"
          />
        </PropertyRow>
        <PropertyRow label="Header bg" inline>
          <ColorPicker
            value={content.headerBg}
            onChange={(c) => apply({ ...content, headerBg: c.toHexString() })}
            size="small"
          />
        </PropertyRow>
        <PropertyRow label="Text" inline>
          <ColorPicker
            value={content.textColor}
            onChange={(c) => apply({ ...content, textColor: c.toHexString() })}
            size="small"
          />
        </PropertyRow>
      </PropertySection>

      <PropertySection title="Cells">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
          {grid.map((row, r) => (
            <div key={r} style={{ display: 'flex', gap: 4 }}>
              {row.map((cell, c) => (
                <Tooltip key={c} title={content.headerRow && r === 0 ? `Header ${c + 1}` : `R${r + 1}C${c + 1}`}>
                  <Input
                    size="small"
                    value={cell}
                    onChange={(e) => setCell(r, c, e.target.value)}
                    style={{
                      fontSize: 11,
                      fontWeight: content.headerRow && r === 0 ? 600 : 400,
                      background:
                        content.headerRow && r === 0
                          ? themeConfig.colors.background.secondary
                          : undefined,
                    }}
                  />
                </Tooltip>
              ))}
            </div>
          ))}
        </div>
      </PropertySection>
    </>
  );
}
