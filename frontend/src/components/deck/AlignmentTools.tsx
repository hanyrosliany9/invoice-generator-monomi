import { Button, Tooltip, Space, Divider } from 'antd';
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';

interface AlignmentToolsProps {
  canvas: FabricCanvas | null;
  disabled?: boolean;
}

export default function AlignmentTools({ canvas, disabled }: AlignmentToolsProps) {
  const getActiveObjects = (): FabricObject[] => {
    if (!canvas) return [];
    return canvas.getActiveObjects();
  };

  const fireModified = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) canvas.fire('object:modified', { target: active });
  };

  // Top-left of an object in canvas space, regardless of its origin. Selection
  // align math below assumes top-left coordinates.
  const objLeft = (o: FabricObject): number => {
    let left = o.left || 0;
    const w = o.getScaledWidth() || 0;
    if (o.originX === 'center') left -= w / 2;
    else if (o.originX === 'right') left -= w;
    return left;
  };
  const objTop = (o: FabricObject): number => {
    let top = o.top || 0;
    const h = o.getScaledHeight() || 0;
    if (o.originY === 'center') top -= h / 2;
    else if (o.originY === 'bottom') top -= h;
    return top;
  };
  // Set an object's top-left, translating back into its own origin space.
  const setObjLeft = (o: FabricObject, left: number) => {
    const w = o.getScaledWidth() || 0;
    if (o.originX === 'center') left += w / 2;
    else if (o.originX === 'right') left += w;
    o.set('left', left);
    o.setCoords();
  };
  const setObjTop = (o: FabricObject, top: number) => {
    const h = o.getScaledHeight() || 0;
    if (o.originY === 'center') top += h / 2;
    else if (o.originY === 'bottom') top += h;
    o.set('top', top);
    o.setCoords();
  };

  // Slide (canvas) bounds for single-object alignment.
  const slideWidth = () => canvas?.getWidth() || 0;
  const slideHeight = () => canvas?.getHeight() || 0;

  const alignLeft = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    // Single object → align to slide left edge. Multi → align to selection edge.
    const target = objects.length === 1 ? 0 : Math.min(...objects.map(objLeft));
    objects.forEach((obj) => setObjLeft(obj, target));
    canvas?.renderAll();
    fireModified();
  };

  const alignCenter = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    let center: number;
    if (objects.length === 1) {
      center = slideWidth() / 2;
    } else {
      const centers = objects.map((o) => objLeft(o) + (o.getScaledWidth() || 0) / 2);
      center = centers.reduce((a, b) => a + b, 0) / centers.length;
    }
    objects.forEach((obj) => setObjLeft(obj, center - (obj.getScaledWidth() || 0) / 2));
    canvas?.renderAll();
    fireModified();
  };

  const alignRight = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    const edge =
      objects.length === 1
        ? slideWidth()
        : Math.max(...objects.map((o) => objLeft(o) + (o.getScaledWidth() || 0)));
    objects.forEach((obj) => setObjLeft(obj, edge - (obj.getScaledWidth() || 0)));
    canvas?.renderAll();
    fireModified();
  };

  const alignTop = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    const target = objects.length === 1 ? 0 : Math.min(...objects.map(objTop));
    objects.forEach((obj) => setObjTop(obj, target));
    canvas?.renderAll();
    fireModified();
  };

  const alignMiddle = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    let middle: number;
    if (objects.length === 1) {
      middle = slideHeight() / 2;
    } else {
      const middles = objects.map((o) => objTop(o) + (o.getScaledHeight() || 0) / 2);
      middle = middles.reduce((a, b) => a + b, 0) / middles.length;
    }
    objects.forEach((obj) => setObjTop(obj, middle - (obj.getScaledHeight() || 0) / 2));
    canvas?.renderAll();
    fireModified();
  };

  const alignBottom = () => {
    const objects = getActiveObjects();
    if (objects.length === 0) return;
    const edge =
      objects.length === 1
        ? slideHeight()
        : Math.max(...objects.map((o) => objTop(o) + (o.getScaledHeight() || 0)));
    objects.forEach((obj) => setObjTop(obj, edge - (obj.getScaledHeight() || 0)));
    canvas?.renderAll();
    fireModified();
  };

  // Distribute: equal spacing between object centers, keeping the two extreme
  // objects fixed. Needs 3+ objects.
  const distributeHorizontal = () => {
    const objects = getActiveObjects();
    if (objects.length < 3) return;
    const sorted = [...objects].sort(
      (a, b) => objLeft(a) + a.getScaledWidth() / 2 - (objLeft(b) + b.getScaledWidth() / 2),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstCenter = objLeft(first) + first.getScaledWidth() / 2;
    const lastCenter = objLeft(last) + last.getScaledWidth() / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    sorted.forEach((obj, i) => {
      if (i === 0 || i === sorted.length - 1) return;
      const targetCenter = firstCenter + step * i;
      setObjLeft(obj, targetCenter - obj.getScaledWidth() / 2);
    });
    canvas?.renderAll();
    fireModified();
  };

  const distributeVertical = () => {
    const objects = getActiveObjects();
    if (objects.length < 3) return;
    const sorted = [...objects].sort(
      (a, b) => objTop(a) + a.getScaledHeight() / 2 - (objTop(b) + b.getScaledHeight() / 2),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstCenter = objTop(first) + first.getScaledHeight() / 2;
    const lastCenter = objTop(last) + last.getScaledHeight() / 2;
    const step = (lastCenter - firstCenter) / (sorted.length - 1);
    sorted.forEach((obj, i) => {
      if (i === 0 || i === sorted.length - 1) return;
      const targetCenter = firstCenter + step * i;
      setObjTop(obj, targetCenter - obj.getScaledHeight() / 2);
    });
    canvas?.renderAll();
    fireModified();
  };

  // Enabled whenever there's a selection: single-object aligns to the slide,
  // multi-object aligns within the selection.
  const hasSelection = getActiveObjects().length >= 1;
  const canDistribute = getActiveObjects().length >= 3;

  return (
    <Space size={4}>
      <Tooltip title="Align Left">
        <Button
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={alignLeft}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>
      <Tooltip title="Align Center">
        <Button
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={alignCenter}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>
      <Tooltip title="Align Right">
        <Button
          size="small"
          icon={<AlignRightOutlined />}
          onClick={alignRight}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>

      <Divider type="vertical" style={{ margin: '0 4px' }} />

      <Tooltip title="Align Top">
        <Button
          size="small"
          icon={<VerticalAlignTopOutlined />}
          onClick={alignTop}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>
      <Tooltip title="Align Middle">
        <Button
          size="small"
          icon={<VerticalAlignMiddleOutlined />}
          onClick={alignMiddle}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>
      <Tooltip title="Align Bottom">
        <Button
          size="small"
          icon={<VerticalAlignBottomOutlined />}
          onClick={alignBottom}
          disabled={disabled || !hasSelection}
        />
      </Tooltip>

      <Divider type="vertical" style={{ margin: '0 4px' }} />

      <Tooltip title="Distribute Horizontally (3+ objects)">
        <Button
          size="small"
          icon={<ColumnWidthOutlined />}
          onClick={distributeHorizontal}
          disabled={disabled || !canDistribute}
        />
      </Tooltip>
      <Tooltip title="Distribute Vertically (3+ objects)">
        <Button
          size="small"
          icon={<ColumnHeightOutlined />}
          onClick={distributeVertical}
          disabled={disabled || !canDistribute}
        />
      </Tooltip>
    </Space>
  );
}
