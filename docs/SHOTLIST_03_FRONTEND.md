# Shot List - Frontend Implementation

## Directory Structure
```
frontend/src/
├── pages/
│   ├── ShotListsPage.tsx         # List all shot lists
│   └── ShotListEditorPage.tsx    # Edit shot list (main editor)
├── components/shot-list/
│   ├── ShotListTable.tsx         # Main table component
│   ├── ShotRow.tsx               # Editable shot row
│   ├── ShotSpecSelect.tsx        # Dropdown for shot specs
│   ├── SceneHeader.tsx           # Scene group header
│   ├── AddShotButton.tsx
│   ├── AddSceneModal.tsx
│   ├── StoryboardUpload.tsx      # Thumbnail upload
│   └── ShotListToolbar.tsx       # Filter, export buttons
├── services/
│   └── shotLists.ts              # API client
├── types/
│   └── shotList.ts               # TypeScript types
└── constants/
    └── shotSpecs.ts              # Shot size, movement, etc. options
```

---

## Task 1: Types

### File: `frontend/src/types/shotList.ts`
```typescript
export type ShotStatus = 'PLANNED' | 'IN_PROGRESS' | 'SHOT' | 'WRAPPED' | 'CUT';

export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: string;
  order: number;
  shotSize?: string;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lens?: string;
  frameRate?: string;
  camera?: string;
  description?: string;
  action?: string;
  dialogue?: string;
  notes?: string;
  storyboardUrl?: string;
  setupNumber?: number;
  estimatedTime?: number;
  status: ShotStatus;
  vfx?: string;
  sfx?: string;
}

export interface ShotListScene {
  id: string;
  shotListId: string;
  sceneNumber: string;
  name: string;
  location?: string;
  intExt?: string;
  dayNight?: string;
  description?: string;
  order: number;
  shots: Shot[];
}

export interface ShotList {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  project?: { id: string; name: string };
  createdById: string;
  createdBy?: { id: string; name: string };
  scenes: ShotListScene[];
  createdAt: string;
  updatedAt: string;
}
```

---

## Task 2: Constants

### File: `frontend/src/constants/shotSpecs.ts`
```typescript
export const SHOT_SIZES = [
  { value: 'EWS', label: 'Extreme Wide Shot' },
  { value: 'WS', label: 'Wide Shot' },
  { value: 'FS', label: 'Full Shot' },
  { value: 'MWS', label: 'Medium Wide Shot' },
  { value: 'MS', label: 'Medium Shot' },
  { value: 'MCU', label: 'Medium Close-Up' },
  { value: 'CU', label: 'Close-Up' },
  { value: 'ECU', label: 'Extreme Close-Up' },
];

export const SHOT_TYPES = [
  { value: 'MASTER', label: 'Master' },
  { value: 'SINGLE', label: 'Single' },
  { value: 'TWO_SHOT', label: 'Two Shot' },
  { value: 'OTS', label: 'Over the Shoulder' },
  { value: 'POV', label: 'POV' },
  { value: 'INSERT', label: 'Insert' },
  { value: 'CUTAWAY', label: 'Cutaway' },
];

export const CAMERA_MOVEMENTS = [
  { value: 'STATIC', label: 'Static' },
  { value: 'PAN', label: 'Pan' },
  { value: 'TILT', label: 'Tilt' },
  { value: 'DOLLY', label: 'Dolly' },
  { value: 'TRACK', label: 'Track' },
  { value: 'CRANE', label: 'Crane' },
  { value: 'HANDHELD', label: 'Handheld' },
  { value: 'STEADICAM', label: 'Steadicam' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'PUSH_IN', label: 'Push In' },
  { value: 'PULL_OUT', label: 'Pull Out' },
];

export const CAMERA_ANGLES = [
  { value: 'EYE_LEVEL', label: 'Eye Level' },
  { value: 'LOW_ANGLE', label: 'Low Angle' },
  { value: 'HIGH_ANGLE', label: 'High Angle' },
  { value: 'DUTCH', label: 'Dutch Angle' },
  { value: 'BIRDS_EYE', label: "Bird's Eye" },
  { value: 'WORMS_EYE', label: "Worm's Eye" },
];

export const LENSES = [
  '14mm', '18mm', '24mm', '28mm', '35mm', '50mm', '85mm', '100mm', '135mm', '200mm'
].map(v => ({ value: v, label: v }));

export const FRAME_RATES = [
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '30', label: '30 fps' },
  { value: '48', label: '48 fps' },
  { value: '60', label: '60 fps' },
  { value: '120', label: '120 fps' },
];

export const CAMERAS = [
  { value: 'A_CAM', label: 'A Cam' },
  { value: 'B_CAM', label: 'B Cam' },
  { value: 'C_CAM', label: 'C Cam' },
  { value: 'DRONE', label: 'Drone' },
];

export const SHOT_STATUSES = [
  { value: 'PLANNED', label: 'Planned', color: 'default' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { value: 'SHOT', label: 'Shot', color: 'success' },
  { value: 'WRAPPED', label: 'Wrapped', color: 'success' },
  { value: 'CUT', label: 'Cut', color: 'error' },
];
```

---

## Task 3: API Service

### File: `frontend/src/services/shotLists.ts`
```typescript
import { apiClient } from '../config/api';
import type { ShotList, Shot, ShotListScene } from '../types/shotList';

export const shotListsApi = {
  // Shot Lists
  getByProject: async (projectId: string): Promise<ShotList[]> => {
    const res = await apiClient.get('/shot-lists', { params: { projectId } });
    return res.data.data || [];
  },
  getById: async (id: string): Promise<ShotList> => {
    const res = await apiClient.get(`/shot-lists/${id}`);
    return res.data.data;
  },
  create: async (data: { name: string; projectId: string; description?: string }): Promise<ShotList> => {
    const res = await apiClient.post('/shot-lists', data);
    return res.data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/shot-lists/${id}`);
  },

  // Scenes
  createScene: async (data: Partial<ShotListScene>): Promise<ShotListScene> => {
    const res = await apiClient.post('/shot-list-scenes', data);
    return res.data.data;
  },
  updateScene: async (id: string, data: Partial<ShotListScene>): Promise<ShotListScene> => {
    const res = await apiClient.put(`/shot-list-scenes/${id}`, data);
    return res.data.data;
  },
  deleteScene: async (id: string): Promise<void> => {
    await apiClient.delete(`/shot-list-scenes/${id}`);
  },

  // Shots
  createShot: async (data: Partial<Shot>): Promise<Shot> => {
    const res = await apiClient.post('/shots', data);
    return res.data.data;
  },
  updateShot: async (id: string, data: Partial<Shot>): Promise<Shot> => {
    const res = await apiClient.put(`/shots/${id}`, data);
    return res.data.data;
  },
  deleteShot: async (id: string): Promise<void> => {
    await apiClient.delete(`/shots/${id}`);
  },
  reorderShots: async (sceneId: string, shotIds: string[]): Promise<Shot[]> => {
    const res = await apiClient.post(`/shots/reorder/${sceneId}`, { shotIds });
    return res.data.data;
  },
  duplicateShot: async (id: string): Promise<Shot> => {
    const res = await apiClient.post(`/shots/${id}/duplicate`);
    return res.data.data;
  },
};
```

---

## Task 4: Shot List Editor Page

### File: `frontend/src/pages/ShotListEditorPage.tsx`
```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App } from 'antd';
import { LeftOutlined, PlusOutlined, FilePdfOutlined } from '@ant-design/icons';
import { shotListsApi } from '../services/shotLists';
import ShotListTable from '../components/shot-list/ShotListTable';
import AddSceneModal from '../components/shot-list/AddSceneModal';
import ShotListToolbar from '../components/shot-list/ShotListToolbar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ShotListEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [addSceneOpen, setAddSceneOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'shotNumber', 'shotSize', 'cameraMovement', 'lens', 'description', 'status'
  ]);

  const { data: shotList, isLoading } = useQuery({
    queryKey: ['shot-list', id],
    queryFn: () => shotListsApi.getById(id!),
    enabled: !!id,
  });

  const addSceneMutation = useMutation({
    mutationFn: shotListsApi.createScene,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', id] });
      message.success('Scene added');
      setAddSceneOpen(false);
    },
  });

  if (isLoading) return <Spin size="large" />;
  if (!shotList) return <div>Shot list not found</div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Title level={4} style={{ margin: 0 }}>{shotList.name}</Title>
        </Space>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setAddSceneOpen(true)}>Add Scene</Button>
          <Button icon={<FilePdfOutlined />} type="primary">Export PDF</Button>
        </Space>
      </Header>

      <ShotListToolbar
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />

      <Content style={{ padding: 24, background: '#f5f5f5' }}>
        <ShotListTable
          shotList={shotList}
          visibleColumns={visibleColumns}
        />
      </Content>

      <AddSceneModal
        open={addSceneOpen}
        onClose={() => setAddSceneOpen(false)}
        onSubmit={(data) => addSceneMutation.mutate({ ...data, shotListId: id! })}
      />
    </Layout>
  );
}
```

---

## Task 5: Shot List Table Component

### File: `frontend/src/components/shot-list/ShotListTable.tsx`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Button, Tag, Input, Select, App, Popconfirm, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined, HolderOutlined } from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { shotListsApi } from '../../services/shotLists';
import { SHOT_SIZES, SHOT_TYPES, CAMERA_MOVEMENTS, LENSES, SHOT_STATUSES } from '../../constants/shotSpecs';
import type { ShotList, Shot } from '../../types/shotList';

interface Props {
  shotList: ShotList;
  visibleColumns: string[];
}

export default function ShotListTable({ shotList, visibleColumns }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

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
      render: (url: string) => url ? <Image src={url} width={80} height={45} /> : <div style={{ width: 80, height: 45, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>,
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
        />
      ),
    },
    {
      key: 'shotType',
      title: 'Type',
      dataIndex: 'shotType',
      width: 130,
      render: (v: string, r: Shot) => (
        <Select size="small" value={v} options={SHOT_TYPES} onChange={(val) => updateMutation.mutate({ id: r.id, data: { shotType: val } })} style={{ width: 110 }} allowClear />
      ),
    },
    {
      key: 'cameraMovement',
      title: 'Movement',
      dataIndex: 'cameraMovement',
      width: 130,
      render: (v: string, r: Shot) => (
        <Select size="small" value={v} options={CAMERA_MOVEMENTS} onChange={(val) => updateMutation.mutate({ id: r.id, data: { cameraMovement: val } })} style={{ width: 110 }} allowClear />
      ),
    },
    {
      key: 'lens',
      title: 'Lens',
      dataIndex: 'lens',
      width: 100,
      render: (v: string, r: Shot) => (
        <Select size="small" value={v} options={LENSES} onChange={(val) => updateMutation.mutate({ id: r.id, data: { lens: val } })} style={{ width: 80 }} allowClear />
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
          options={SHOT_STATUSES.map(s => ({ ...s, label: <Tag color={s.color}>{s.label}</Tag> }))}
          onChange={(val) => updateMutation.mutate({ id: r.id, data: { status: val } })}
          style={{ width: 100 }}
        />
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 80,
      render: (_: any, r: Shot) => (
        <Space size="small">
          <Button size="small" icon={<CopyOutlined />} onClick={() => shotListsApi.duplicateShot(r.id).then(() => queryClient.invalidateQueries({ queryKey: ['shot-list', shotList.id] }))} />
          <Popconfirm title="Delete shot?" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
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
          <div style={{ background: '#1f2937', color: '#fff', padding: '8px 16px', borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{scene.sceneNumber}</strong> - {scene.name} {scene.intExt && `(${scene.intExt})`} {scene.dayNight && `/ ${scene.dayNight}`}</span>
            <Button size="small" icon={<PlusOutlined />} onClick={() => addShotMutation.mutate({ sceneId: scene.id, shotNumber: `${scene.shots.length + 1}` })}>Add Shot</Button>
          </div>

          {/* Shots Table */}
          <Table
            dataSource={scene.shots}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ background: '#fff' }}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## Task 6: Add Routes

### File: `frontend/src/App.tsx`

Add imports:
```typescript
import ShotListEditorPage from './pages/ShotListEditorPage';
```

Add route inside `<Routes>`:
```typescript
<Route path="/shot-lists/:id" element={<ShotListEditorPage />} />
```

---

## Task 7: Install dnd-kit

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Verification

1. Start frontend: `npm run dev`
2. Navigate to `/shot-lists/<id>`
3. Verify table renders with editable cells
4. Add a scene, add shots
5. Verify dropdowns work for shot specs
