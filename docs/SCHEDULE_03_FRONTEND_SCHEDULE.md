# Shooting Schedule - Frontend Implementation

## Directory Structure
```
frontend/src/
├── types/
│   └── schedule.ts
├── constants/
│   └── scheduleSpecs.ts
├── services/
│   └── schedules.ts
├── pages/
│   └── ShootingSchedulePage.tsx
└── components/
    └── schedule/
        ├── ScheduleStripboard.tsx
        ├── ShootDayColumn.tsx
        ├── ScheduleStrip.tsx
        ├── AddStripModal.tsx
        ├── ImportScenesModal.tsx
        └── ScheduleToolbar.tsx
```

---

## Task 1: Create Types

### File: `types/schedule.ts`
```typescript
export type StripType = 'SCENE' | 'BANNER';
export type BannerType = 'DAY_BREAK' | 'MEAL_BREAK' | 'COMPANY_MOVE' | 'NOTE';

export interface ShootingSchedule {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  shotListId?: string;
  startDate?: string;
  pagesPerDay: number;
  shootDays: ShootDay[];
  project?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface ShootDay {
  id: string;
  scheduleId: string;
  dayNumber: number;
  shootDate?: string;
  location?: string;
  notes?: string;
  order: number;
  strips: ScheduleStrip[];
}

export interface ScheduleStrip {
  id: string;
  shootDayId: string;
  order: number;
  stripType: StripType;
  // Scene data
  sceneId?: string;
  sceneNumber?: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  estimatedTime?: number;
  // Banner data
  bannerType?: BannerType;
  bannerText?: string;
  bannerColor?: string;
}

export interface CreateScheduleDto {
  name: string;
  description?: string;
  projectId: string;
  shotListId?: string;
  startDate?: string;
  pagesPerDay?: number;
}

export interface CreateShootDayDto {
  scheduleId: string;
  dayNumber: number;
  shootDate?: string;
  location?: string;
  notes?: string;
}

export interface CreateStripDto {
  shootDayId: string;
  stripType: StripType;
  sceneId?: string;
  sceneNumber?: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  estimatedTime?: number;
  bannerType?: BannerType;
  bannerText?: string;
  bannerColor?: string;
}

export interface ReorderStripsDto {
  strips: { stripId: string; shootDayId: string; order: number }[];
}
```

---

## Task 2: Create Constants

### File: `constants/scheduleSpecs.ts`
```typescript
export const STRIP_COLORS = {
  // Scene colors by INT/EXT + DAY/NIGHT
  'INT_DAY': '#FFFFFF',    // White
  'INT_NIGHT': '#FFE4B5',  // Moccasin (cream)
  'EXT_DAY': '#90EE90',    // Light green
  'EXT_NIGHT': '#87CEEB',  // Sky blue

  // Banner colors
  'DAY_BREAK': '#4A5568',  // Gray
  'MEAL_BREAK': '#F6AD55', // Orange
  'COMPANY_MOVE': '#9F7AEA', // Purple
  'NOTE': '#63B3ED',       // Light blue
};

export const BANNER_TYPES = [
  { value: 'DAY_BREAK', label: 'Day Break', icon: '📅' },
  { value: 'MEAL_BREAK', label: 'Meal Break', icon: '🍽️' },
  { value: 'COMPANY_MOVE', label: 'Company Move', icon: '🚚' },
  { value: 'NOTE', label: 'Note', icon: '📝' },
];

export const INT_EXT_OPTIONS = [
  { value: 'INT', label: 'INT' },
  { value: 'EXT', label: 'EXT' },
  { value: 'INT/EXT', label: 'INT/EXT' },
];

export const DAY_NIGHT_OPTIONS = [
  { value: 'DAY', label: 'DAY' },
  { value: 'NIGHT', label: 'NIGHT' },
  { value: 'DAWN', label: 'DAWN' },
  { value: 'DUSK', label: 'DUSK' },
];

export function getStripColor(strip: { stripType: string; intExt?: string; dayNight?: string; bannerType?: string }): string {
  if (strip.stripType === 'BANNER') {
    return STRIP_COLORS[strip.bannerType as keyof typeof STRIP_COLORS] || STRIP_COLORS.NOTE;
  }
  const key = `${strip.intExt || 'INT'}_${strip.dayNight || 'DAY'}`;
  return STRIP_COLORS[key as keyof typeof STRIP_COLORS] || STRIP_COLORS.INT_DAY;
}
```

---

## Task 3: Create API Service

### File: `services/schedules.ts`
```typescript
import { apiClient } from '../config/api';
import type { ShootingSchedule, ShootDay, ScheduleStrip, CreateScheduleDto, CreateShootDayDto, CreateStripDto, ReorderStripsDto } from '../types/schedule';

export const schedulesApi = {
  // Schedule CRUD
  getByProject: async (projectId: string): Promise<ShootingSchedule[]> => {
    const res = await apiClient.get(`/schedules?projectId=${projectId}`);
    return res.data.data;
  },

  getById: async (id: string): Promise<ShootingSchedule> => {
    const res = await apiClient.get(`/schedules/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateScheduleDto): Promise<ShootingSchedule> => {
    const res = await apiClient.post('/schedules', dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CreateScheduleDto>): Promise<ShootingSchedule> => {
    const res = await apiClient.put(`/schedules/${id}`, dto);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/${id}`);
  },

  autoSchedule: async (id: string, groupBy: string): Promise<ShootingSchedule> => {
    const res = await apiClient.post(`/schedules/${id}/auto-schedule`, { groupBy });
    return res.data.data;
  },

  // Shoot Days
  createDay: async (dto: CreateShootDayDto): Promise<ShootDay> => {
    const res = await apiClient.post('/schedules/days', dto);
    return res.data.data;
  },

  updateDay: async (id: string, dto: Partial<CreateShootDayDto>): Promise<ShootDay> => {
    const res = await apiClient.put(`/schedules/days/${id}`, dto);
    return res.data.data;
  },

  deleteDay: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/days/${id}`);
  },

  // Strips
  createStrip: async (dto: CreateStripDto): Promise<ScheduleStrip> => {
    const res = await apiClient.post('/schedules/strips', dto);
    return res.data.data;
  },

  updateStrip: async (id: string, dto: Partial<CreateStripDto>): Promise<ScheduleStrip> => {
    const res = await apiClient.put(`/schedules/strips/${id}`, dto);
    return res.data.data;
  },

  deleteStrip: async (id: string): Promise<void> => {
    await apiClient.delete(`/schedules/strips/${id}`);
  },

  reorderStrips: async (dto: ReorderStripsDto): Promise<void> => {
    await apiClient.post('/schedules/strips/reorder', dto);
  },
};
```

---

## Task 4: Create Main Page

### File: `pages/ShootingSchedulePage.tsx`
```typescript
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App, Empty, Dropdown, DatePicker } from 'antd';
import { LeftOutlined, PlusOutlined, FilePdfOutlined, SettingOutlined, ImportOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { schedulesApi } from '../services/schedules';
import ScheduleStripboard from '../components/schedule/ScheduleStripboard';
import ScheduleToolbar from '../components/schedule/ScheduleToolbar';
import AddStripModal from '../components/schedule/AddStripModal';
import ImportScenesModal from '../components/schedule/ImportScenesModal';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ShootingSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [addStripOpen, setAddStripOpen] = useState(false);
  const [importScenesOpen, setImportScenesOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulesApi.getById(id!),
    enabled: !!id,
  });

  const addDayMutation = useMutation({
    mutationFn: () => schedulesApi.createDay({
      scheduleId: id!,
      dayNumber: (schedule?.shootDays.length || 0) + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      message.success('Shoot day added');
    },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />;
  if (!schedule) return <Empty description="Schedule not found" />;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
        <Space size="large">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Title level={4} style={{ margin: 0 }}>{schedule.name}</Title>
        </Space>
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => setImportScenesOpen(true)}>Import Scenes</Button>
          <Button icon={<PlusOutlined />} onClick={() => addDayMutation.mutate()}>Add Day</Button>
          <Button icon={<FilePdfOutlined />} type="primary" onClick={() => window.open(`/api/schedules/${id}/export/pdf`, '_blank')}>
            Export PDF
          </Button>
        </Space>
      </Header>

      <ScheduleToolbar schedule={schedule} />

      <Content style={{ padding: 24, overflow: 'auto' }}>
        <ScheduleStripboard
          schedule={schedule}
          onAddStrip={(dayId) => { setSelectedDayId(dayId); setAddStripOpen(true); }}
        />
      </Content>

      <AddStripModal
        open={addStripOpen}
        shootDayId={selectedDayId}
        onClose={() => setAddStripOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          setAddStripOpen(false);
        }}
      />

      <ImportScenesModal
        open={importScenesOpen}
        scheduleId={id!}
        shotListId={schedule.shotListId}
        onClose={() => setImportScenesOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          setImportScenesOpen(false);
        }}
      />
    </Layout>
  );
}
```

---

## Task 5: Create Stripboard Component

### File: `components/schedule/ScheduleStripboard.tsx`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { App } from 'antd';
import { schedulesApi } from '../../services/schedules';
import type { ShootingSchedule, ScheduleStrip } from '../../types/schedule';
import ShootDayColumn from './ShootDayColumn';
import ScheduleStripComponent from './ScheduleStrip';

interface Props {
  schedule: ShootingSchedule;
  onAddStrip: (dayId: string) => void;
}

export default function ScheduleStripboard({ schedule, onAddStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [activeStrip, setActiveStrip] = useState<ScheduleStrip | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const reorderMutation = useMutation({
    mutationFn: schedulesApi.reorderStrips,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule', schedule.id] }),
    onError: () => message.error('Failed to reorder'),
  });

  const handleDragStart = (event: any) => {
    const { active } = event;
    const strip = schedule.shootDays
      .flatMap(d => d.strips)
      .find(s => s.id === active.id);
    setActiveStrip(strip || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStrip(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Build new order
    const allStrips = schedule.shootDays.flatMap(d =>
      d.strips.map(s => ({ stripId: s.id, shootDayId: s.shootDayId, order: s.order }))
    );

    // Find target day and position
    const targetDayId = over.data.current?.dayId || active.data.current?.dayId;
    const newOrder = allStrips
      .filter(s => s.shootDayId === targetDayId)
      .map((s, idx) => ({ ...s, order: idx }));

    reorderMutation.mutate({ strips: newOrder });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', minHeight: 400 }}>
        {schedule.shootDays.map(day => (
          <ShootDayColumn
            key={day.id}
            day={day}
            scheduleId={schedule.id}
            onAddStrip={() => onAddStrip(day.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeStrip && <ScheduleStripComponent strip={activeStrip} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## Task 6: Create ShootDayColumn

### File: `components/schedule/ShootDayColumn.tsx`
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, Typography, Button, Space, Popconfirm, App, Input, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';
import { schedulesApi } from '../../services/schedules';
import type { ShootDay } from '../../types/schedule';
import ScheduleStripComponent from './ScheduleStrip';

const { Text } = Typography;

interface Props {
  day: ShootDay;
  scheduleId: string;
  onAddStrip: () => void;
}

export default function ShootDayColumn({ day, scheduleId, onAddStrip }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.id}`,
    data: { dayId: day.id },
  });

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.deleteDay(day.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      message.success('Day deleted');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ShootDay>) => schedulesApi.updateDay(day.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] }),
  });

  // Calculate page total
  const totalPages = day.strips
    .filter(s => s.stripType === 'SCENE')
    .reduce((sum, s) => sum + (s.pageCount || 0), 0);

  return (
    <Card
      ref={setNodeRef}
      style={{
        minWidth: 280,
        maxWidth: 320,
        background: isOver ? '#f0f5ff' : '#fff',
        transition: 'background 0.2s',
      }}
      title={
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text strong>Day {day.dayNumber}</Text>
            <Space size="small">
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(!editing)} />
              <Popconfirm title="Delete this day?" onConfirm={() => deleteMutation.mutate()}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          </Space>
          {day.shootDate && <Text type="secondary">{dayjs(day.shootDate).format('ddd, MMM D')}</Text>}
          <Text type="secondary">{totalPages.toFixed(1)} pages</Text>
        </Space>
      }
      extra={<Button size="small" icon={<PlusOutlined />} onClick={onAddStrip} />}
    >
      {editing && (
        <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
          <DatePicker
            value={day.shootDate ? dayjs(day.shootDate) : null}
            onChange={(date) => updateMutation.mutate({ shootDate: date?.toISOString() })}
            style={{ width: '100%' }}
            placeholder="Shoot date"
          />
          <Input
            value={day.location || ''}
            onChange={(e) => updateMutation.mutate({ location: e.target.value })}
            placeholder="Location"
          />
        </Space>
      )}

      <SortableContext items={day.strips.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100 }}>
          {day.strips.map(strip => (
            <ScheduleStripComponent
              key={strip.id}
              strip={strip}
              scheduleId={scheduleId}
            />
          ))}
        </div>
      </SortableContext>
    </Card>
  );
}
```

---

## Task 7: Create ScheduleStrip Component

### File: `components/schedule/ScheduleStrip.tsx`
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, Popconfirm, Button, App } from 'antd';
import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { schedulesApi } from '../../services/schedules';
import { getStripColor } from '../../constants/scheduleSpecs';
import type { ScheduleStrip } from '../../types/schedule';

const { Text } = Typography;

interface Props {
  strip: ScheduleStrip;
  scheduleId?: string;
  isDragging?: boolean;
}

export default function ScheduleStripComponent({ strip, scheduleId, isDragging }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: strip.id,
    data: { dayId: strip.shootDayId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const deleteMutation = useMutation({
    mutationFn: () => schedulesApi.deleteStrip(strip.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      message.success('Strip deleted');
    },
  });

  const backgroundColor = getStripColor(strip);

  if (strip.stripType === 'BANNER') {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          padding: '8px 12px',
          background: backgroundColor,
          color: '#fff',
          borderRadius: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        {...attributes}
        {...listeners}
      >
        <Text style={{ color: '#fff' }} strong>{strip.bannerText || strip.bannerType}</Text>
        <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()}>
          <Button size="small" type="text" icon={<DeleteOutlined />} style={{ color: '#fff' }} />
        </Popconfirm>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '8px 12px',
        background: backgroundColor,
        border: '1px solid #d9d9d9',
        borderRadius: 4,
        cursor: 'grab',
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text strong>{strip.sceneNumber}</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>{strip.intExt} / {strip.dayNight}</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text type="secondary">{strip.pageCount?.toFixed(1) || '0'}p</Text>
          <Popconfirm title="Delete?" onConfirm={() => deleteMutation.mutate()}>
            <Button size="small" type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </div>
      </div>
      <Text ellipsis style={{ fontSize: 12 }}>{strip.sceneName}</Text>
      {strip.location && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{strip.location}</Text>}
    </div>
  );
}
```

---

## Task 8: Create AddStripModal

### File: `components/schedule/AddStripModal.tsx`
```typescript
import { Modal, Form, Input, Select, InputNumber, Radio, ColorPicker } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedules';
import { BANNER_TYPES, INT_EXT_OPTIONS, DAY_NIGHT_OPTIONS, STRIP_COLORS } from '../../constants/scheduleSpecs';
import type { CreateStripDto } from '../../types/schedule';

interface Props {
  open: boolean;
  shootDayId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStripModal({ open, shootDayId, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const stripType = Form.useWatch('stripType', form);

  const createMutation = useMutation({
    mutationFn: (dto: CreateStripDto) => schedulesApi.createStrip(dto),
    onSuccess: () => {
      form.resetFields();
      onSuccess();
    },
  });

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (!shootDayId) return;
      createMutation.mutate({ ...values, shootDayId });
    });
  };

  return (
    <Modal
      title="Add Strip"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={createMutation.isPending}
    >
      <Form form={form} layout="vertical" initialValues={{ stripType: 'SCENE', intExt: 'INT', dayNight: 'DAY' }}>
        <Form.Item name="stripType" label="Type">
          <Radio.Group>
            <Radio.Button value="SCENE">Scene</Radio.Button>
            <Radio.Button value="BANNER">Banner</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {stripType === 'SCENE' ? (
          <>
            <Form.Item name="sceneNumber" label="Scene Number" rules={[{ required: true }]}>
              <Input placeholder="e.g., 1, 2A, 3" />
            </Form.Item>
            <Form.Item name="sceneName" label="Scene Name">
              <Input placeholder="Scene description" />
            </Form.Item>
            <Form.Item name="intExt" label="INT/EXT">
              <Select options={INT_EXT_OPTIONS} />
            </Form.Item>
            <Form.Item name="dayNight" label="Day/Night">
              <Select options={DAY_NIGHT_OPTIONS} />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Input placeholder="Location name" />
            </Form.Item>
            <Form.Item name="pageCount" label="Page Count">
              <InputNumber min={0} step={0.125} placeholder="e.g., 2.5" style={{ width: '100%' }} />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="bannerType" label="Banner Type" rules={[{ required: true }]}>
              <Select options={BANNER_TYPES} />
            </Form.Item>
            <Form.Item name="bannerText" label="Text">
              <Input placeholder="Banner text" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
```

---

## Task 9: Add Routes

### File: `App.tsx` or routes config

Add route:
```typescript
import ShootingSchedulePage from './pages/ShootingSchedulePage';

// In routes array:
{ path: '/schedules/:id', element: <ShootingSchedulePage /> }
```

---

## Task 10: Link from Project Page

### File: `pages/ProjectDetailPage.tsx`

Add button/link to schedules:
```typescript
<Button onClick={() => navigate(`/projects/${project.id}/schedules`)}>
  Shooting Schedules
</Button>
```

---

## Verification

1. Navigate to a project
2. Create a new shooting schedule
3. Add shoot days
4. Add scene strips and banners
5. Drag and drop to reorder
6. Verify data persists on refresh
