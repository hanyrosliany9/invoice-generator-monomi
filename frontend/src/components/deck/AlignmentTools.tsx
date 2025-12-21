import { Button, Tooltip, Space, Divider } from 'antd';
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
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

  const alignLeft = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const minLeft = Math.min(...objects.map((o) => o.left || 0));
    objects.forEach((obj) => {
      obj.set('left', minLeft);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignCenter = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const centers = objects.map((o) => (o.left || 0) + (o.getScaledWidth() || 0) / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

    objects.forEach((obj) => {
      obj.set('left', avgCenter - (obj.getScaledWidth() || 0) / 2);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignRight = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const maxRight = Math.max(
      ...objects.map((o) => (o.left || 0) + (o.getScaledWidth() || 0))
    );
    objects.forEach((obj) => {
      obj.set('left', maxRight - (obj.getScaledWidth() || 0));
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignTop = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const minTop = Math.min(...objects.map((o) => o.top || 0));
    objects.forEach((obj) => {
      obj.set('top', minTop);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignMiddle = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const middles = objects.map((o) => (o.top || 0) + (o.getScaledHeight() || 0) / 2);
    const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;

    objects.forEach((obj) => {
      obj.set('top', avgMiddle - (obj.getScaledHeight() || 0) / 2);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignBottom = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const maxBottom = Math.max(
      ...objects.map((o) => (o.top || 0) + (o.getScaledHeight() || 0))
    );
    objects.forEach((obj) => {
      obj.set('top', maxBottom - (obj.getScaledHeight() || 0));
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const hasMultipleSelection = getActiveObjects().length >= 2;

  return (
    <Space size={4}>
      <Tooltip title="Align Left">
        <Button
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={alignLeft}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Center">
        <Button
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={alignCenter}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Right">
        <Button
          size="small"
          icon={<AlignRightOutlined />}
          onClick={alignRight}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>

      <Divider type="vertical" style={{ margin: '0 4px' }} />

      <Tooltip title="Align Top">
        <Button
          size="small"
          icon={<VerticalAlignTopOutlined />}
          onClick={alignTop}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Middle">
        <Button
          size="small"
          icon={<VerticalAlignMiddleOutlined />}
          onClick={alignMiddle}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Bottom">
        <Button
          size="small"
          icon={<VerticalAlignBottomOutlined />}
          onClick={alignBottom}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
    </Space>
  );
}
