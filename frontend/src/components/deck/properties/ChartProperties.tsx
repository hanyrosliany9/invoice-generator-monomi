import { useCallback, useMemo } from 'react';
import { Button, Select, Switch, ColorPicker, Input, InputNumber, Space, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { FabricObject } from 'fabric';
import { useTheme } from '../../../theme';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { rebuildElementObject, type ChartContent } from '../../../utils/deckCanvasUtils';

interface ChartPropertiesProps {
  object: FabricObject;
}

const DEFAULT: ChartContent = {
  chartType: 'bar',
  labels: ['A', 'B', 'C'],
  series: [{ name: 'Series 1', color: '#3b82f6', values: [4, 7, 5] }],
  title: '',
  showLegend: true,
};

const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

// Make every series' values array exactly `n` long.
const padSeriesValues = (content: ChartContent, n: number): ChartContent => ({
  ...content,
  series: content.series.map((s) => {
    const values = [...s.values];
    while (values.length < n) values.push(0);
    values.length = n;
    return { ...s, values };
  }),
});

export default function ChartProperties({ object }: ChartPropertiesProps) {
  const { theme: themeConfig } = useTheme();
  const { canvas } = useDeckCanvasStore();

  const content = useMemo<ChartContent>(() => {
    const stored = (object as any).get?.('elementContent') as ChartContent | undefined;
    return { ...DEFAULT, ...(stored || {}) };
  }, [object]);

  const apply = useCallback(
    (next: ChartContent) => {
      if (!canvas) return;
      void rebuildElementObject(canvas, object, next);
    },
    [canvas, object],
  );

  const setLabel = (i: number, value: string) => {
    const labels = [...content.labels];
    labels[i] = value;
    apply({ ...content, labels });
  };

  const addLabel = () => {
    const labels = [...content.labels, `Cat ${content.labels.length + 1}`];
    apply(padSeriesValues({ ...content, labels }, labels.length));
  };

  const removeLabel = (i: number) => {
    if (content.labels.length <= 1) return;
    const labels = content.labels.filter((_, idx) => idx !== i);
    const series = content.series.map((s) => ({
      ...s,
      values: s.values.filter((_, idx) => idx !== i),
    }));
    apply({ ...content, labels, series });
  };

  const setSeriesValue = (si: number, vi: number, value: number) => {
    const series = content.series.map((s, idx) => {
      if (idx !== si) return s;
      const values = [...s.values];
      values[vi] = value;
      return { ...s, values };
    });
    apply({ ...content, series });
  };

  const setSeriesName = (si: number, name: string) => {
    const series = content.series.map((s, idx) => (idx === si ? { ...s, name } : s));
    apply({ ...content, series });
  };

  const setSeriesColor = (si: number, color: string) => {
    const series = content.series.map((s, idx) => (idx === si ? { ...s, color } : s));
    apply({ ...content, series });
  };

  const addSeries = () => {
    const color = PALETTE[content.series.length % PALETTE.length];
    const series = [
      ...content.series,
      { name: `Series ${content.series.length + 1}`, color, values: content.labels.map(() => 0) },
    ];
    apply({ ...content, series });
  };

  const removeSeries = (si: number) => {
    if (content.series.length <= 1) return;
    apply({ ...content, series: content.series.filter((_, idx) => idx !== si) });
  };

  return (
    <>
      <PropertySection title="Chart">
        <PropertyRow label="Type" inline>
          <Select
            size="small"
            value={content.chartType}
            onChange={(v) => apply({ ...content, chartType: v })}
            style={{ width: 110 }}
            options={[
              { value: 'bar', label: 'Bar' },
              { value: 'line', label: 'Line' },
              { value: 'pie', label: 'Pie' },
            ]}
          />
        </PropertyRow>

        <PropertyRow label="Title">
          <Input
            size="small"
            value={content.title}
            placeholder="Chart title"
            onChange={(e) => apply({ ...content, title: e.target.value })}
          />
        </PropertyRow>

        <PropertyRow label="Legend" inline>
          <Switch
            size="small"
            checked={content.showLegend}
            onChange={(v) => apply({ ...content, showLegend: v })}
          />
        </PropertyRow>
      </PropertySection>

      <PropertySection title="Categories">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {content.labels.map((label, i) => (
            <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <Input
                size="small"
                value={label}
                onChange={(e) => setLabel(i, e.target.value)}
              />
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeLabel(i)}
                disabled={content.labels.length <= 1}
              />
            </div>
          ))}
          <Button size="small" icon={<PlusOutlined />} onClick={addLabel}>
            Add category
          </Button>
        </div>
      </PropertySection>

      <PropertySection title="Series">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {content.series.map((s, si) => (
            <div
              key={si}
              style={{
                border: `1px solid ${themeConfig.colors.border.light}`,
                borderRadius: 6,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <ColorPicker
                  size="small"
                  value={s.color}
                  onChange={(c) => setSeriesColor(si, c.toHexString())}
                />
                <Input
                  size="small"
                  value={s.name}
                  onChange={(e) => setSeriesName(si, e.target.value)}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeSeries(si)}
                  disabled={content.series.length <= 1}
                />
              </div>
              <Space wrap size={4}>
                {content.labels.map((label, vi) => (
                  <div key={vi} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 10, color: themeConfig.colors.text.secondary }}>
                      {label}
                    </span>
                    <InputNumber
                      size="small"
                      value={s.values[vi] ?? 0}
                      onChange={(v) => setSeriesValue(si, vi, Number(v) || 0)}
                      style={{ width: 60 }}
                    />
                  </div>
                ))}
              </Space>
            </div>
          ))}
          <Divider style={{ margin: '4px 0' }} />
          <Button size="small" icon={<PlusOutlined />} onClick={addSeries}>
            Add series
          </Button>
        </div>
      </PropertySection>
    </>
  );
}
