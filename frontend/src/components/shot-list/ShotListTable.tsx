import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Input, Select, App, Popconfirm, Image, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined, HolderOutlined } from '@ant-design/icons';
import { shotListsApi } from '../../services/shotLists';
import { SHOT_SIZES, SHOT_TYPES, CAMERA_MOVEMENTS, CAMERA_ANGLES, LENSES, FRAME_RATES, CAMERAS, SHOT_STATUSES } from '../../constants/shotSpecs';
import type { ShotList, Shot, ShotStatus } from '../../types/shotList';
import type { Theme } from '../../theme/types';

interface Props {
  shotList: ShotList;
  visibleColumns: string[];
  theme?: Theme;
}

export default function ShotListTable({ shotList, visibleColumns, theme }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  // Fallback to default colors if theme is not provided
  const sceneHeaderBg = theme?.colors.accent.primary || '#1f2937';
  const tableCardBg = theme?.colors.card.background || '#fff';

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Shot> }) => shotListsApi.updateShot(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shot-list', shotList.id] }),
  });

  const addShotMutation = useMutation({
    mutationFn: shotListsApi.createShot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', shotList.id] });
      message.success('Shot added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: shotListsApi.deleteShot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', shotList.id] });
      message.success('Shot deleted');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: shotListsApi.duplicateShot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', shotList.id] });
      message.success('Shot duplicated');
    },
  });

  const allColumns = [
    {
      key: 'drag',
      title: '',
      width: 40,
      render: () => <HolderOutlined style={{ cursor: 'grab' }} />,
    },
    {
      key: 'shotNumber',
      title: '#',
      dataIndex: 'shotNumber',
      width: 80,
      render: (v: string, r: Shot) => (
        <Input
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { shotNumber: e.target.value } })}
          style={{ width: 60 }}
        />
      ),
    },
    {
      key: 'storyboard',
      title: 'Storyboard',
      dataIndex: 'storyboardUrl',
      width: 100,
      render: (url: string) => url ? <Image src={url} width={80} height={45} /> : <div style={{ width: 80, height: 45, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>+</div>,
    },
    {
      key: 'shotSize',
      title: 'Size',
      dataIndex: 'shotSize',
      width: 140,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={SHOT_SIZES}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { shotSize: val } })}
          style={{ width: 120 }}
          allowClear
          placeholder="Size"
        />
      ),
    },
    {
      key: 'shotType',
      title: 'Type',
      dataIndex: 'shotType',
      width: 130,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={SHOT_TYPES}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { shotType: val } })}
          style={{ width: 110 }}
          allowClear
          placeholder="Type"
        />
      ),
    },
    {
      key: 'cameraAngle',
      title: 'Angle',
      dataIndex: 'cameraAngle',
      width: 130,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={CAMERA_ANGLES}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { cameraAngle: val } })}
          style={{ width: 110 }}
          allowClear
          placeholder="Angle"
        />
      ),
    },
    {
      key: 'cameraMovement',
      title: 'Movement',
      dataIndex: 'cameraMovement',
      width: 130,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={CAMERA_MOVEMENTS}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { cameraMovement: val } })}
          style={{ width: 110 }}
          allowClear
          placeholder="Movement"
        />
      ),
    },
    {
      key: 'lens',
      title: 'Lens',
      dataIndex: 'lens',
      width: 100,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={LENSES}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { lens: val } })}
          style={{ width: 80 }}
          allowClear
          placeholder="Lens"
        />
      ),
    },
    {
      key: 'frameRate',
      title: 'Frame Rate',
      dataIndex: 'frameRate',
      width: 110,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={FRAME_RATES}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { frameRate: val } })}
          style={{ width: 90 }}
          allowClear
          placeholder="FPS"
        />
      ),
    },
    {
      key: 'camera',
      title: 'Camera',
      dataIndex: 'camera',
      width: 100,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={CAMERAS}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { camera: val } })}
          style={{ width: 80 }}
          allowClear
          placeholder="Cam"
        />
      ),
    },
    {
      key: 'description',
      title: 'Description',
      dataIndex: 'description',
      render: (v: string, r: Shot) => (
        <Input.TextArea
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { description: e.target.value } })}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="Description"
        />
      ),
    },
    {
      key: 'action',
      title: 'Action',
      dataIndex: 'action',
      render: (v: string, r: Shot) => (
        <Input.TextArea
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { action: e.target.value } })}
          autoSize={{ minRows: 1, maxRows: 2 }}
          placeholder="Action"
        />
      ),
    },
    {
      key: 'dialogue',
      title: 'Dialogue',
      dataIndex: 'dialogue',
      render: (v: string, r: Shot) => (
        <Input.TextArea
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { dialogue: e.target.value } })}
          autoSize={{ minRows: 1, maxRows: 2 }}
          placeholder="Dialogue"
        />
      ),
    },
    {
      key: 'notes',
      title: 'Notes',
      dataIndex: 'notes',
      render: (v: string, r: Shot) => (
        <Input
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { notes: e.target.value } })}
          placeholder="Notes"
        />
      ),
    },
    {
      key: 'setupNumber',
      title: 'Setup #',
      dataIndex: 'setupNumber',
      width: 80,
      render: (v: number, r: Shot) => (
        <Input
          size="small"
          type="number"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { setupNumber: e.target.value ? parseInt(e.target.value) : undefined } })}
          style={{ width: 60 }}
          placeholder="Setup"
        />
      ),
    },
    {
      key: 'estimatedTime',
      title: 'Est. Time (sec)',
      dataIndex: 'estimatedTime',
      width: 100,
      render: (v: number, r: Shot) => (
        <Input
          size="small"
          type="number"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { estimatedTime: e.target.value ? parseInt(e.target.value) : undefined } })}
          style={{ width: 80 }}
          placeholder="Seconds"
        />
      ),
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (v: string, r: Shot) => (
        <Select
          size="small"
          value={v}
          options={SHOT_STATUSES.map(s => ({ value: s.value, label: <Tag color={s.color}>{s.label}</Tag> }))}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { status: val as ShotStatus } })}
          style={{ width: 100 }}
        />
      ),
    },
    {
      key: 'vfx',
      title: 'VFX',
      dataIndex: 'vfx',
      render: (v: string, r: Shot) => (
        <Input
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { vfx: e.target.value } })}
          placeholder="VFX"
        />
      ),
    },
    {
      key: 'sfx',
      title: 'SFX',
      dataIndex: 'sfx',
      render: (v: string, r: Shot) => (
        <Input
          size="small"
          value={v}
          onChange={(e) => updateMutation.mutate({ id: r.id, data: { sfx: e.target.value } })}
          placeholder="SFX"
        />
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, r: Shot) => (
        <Space size="small">
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => duplicateMutation.mutate(r.id)}
            title="Duplicate shot"
          />
          <Popconfirm title="Delete this shot?" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger title="Delete shot" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columns = allColumns.filter(c => c.key === 'drag' || c.key === 'actions' || visibleColumns.includes(c.key));

  return (
    <div>
      {shotList.scenes.map((scene) => (
        <div key={scene.id} style={{ marginBottom: 24 }}>
          {/* Scene Header */}
          <div style={{ background: sceneHeaderBg, color: '#fff', padding: '8px 16px', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <strong>{scene.sceneNumber}</strong> - {scene.name}
              {scene.intExt && ` (${scene.intExt})`}
              {scene.dayNight && ` / ${scene.dayNight}`}
            </span>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => addShotMutation.mutate({ sceneId: scene.id, shotNumber: `${scene.shots.length + 1}` })}
              style={{ background: theme?.colors.background.primary || '#fff', color: sceneHeaderBg }}
            >
              Add Shot
            </Button>
          </div>

          {/* Shots Table */}
          <Table
            dataSource={scene.shots}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ background: tableCardBg }}
            scroll={{ x: 1200 }}
          />
        </div>
      ))}
    </div>
  );
}
