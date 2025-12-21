# Call Sheet - Frontend Implementation

## Directory Structure
```
frontend/src/
├── types/
│   └── callSheet.ts
├── constants/
│   └── departments.ts
├── services/
│   └── callSheets.ts
├── pages/
│   ├── CallSheetEditorPage.tsx
│   └── CallSheetViewPage.tsx
└── components/
    └── call-sheet/
        ├── CallSheetHeader.tsx
        ├── CastCallTable.tsx
        ├── CrewCallTable.tsx
        ├── SceneScheduleTable.tsx
        ├── LocationCard.tsx
        ├── WeatherCard.tsx
        ├── NotesSection.tsx
        └── AddCastModal.tsx
```

---

## Task 1: Create Types

### File: `types/callSheet.ts`
```typescript
export type CallSheetStatus = 'DRAFT' | 'READY' | 'SENT' | 'UPDATED';
export type CallStatus = 'PENDING' | 'CONFIRMED' | 'ON_SET' | 'WRAPPED';

export interface CallSheet {
  id: string;
  scheduleId: string;
  shootDayId: string;
  createdById: string;
  callSheetNumber: number;
  productionName?: string;
  director?: string;
  producer?: string;
  shootDate: string;
  generalCallTime?: string;
  firstShotTime?: string;
  wrapTime?: string;
  locationName?: string;
  locationAddress?: string;
  parkingNotes?: string;
  mapUrl?: string;
  weatherHigh?: number;
  weatherLow?: number;
  weatherCondition?: string;
  sunrise?: string;
  sunset?: string;
  nearestHospital?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  generalNotes?: string;
  productionNotes?: string;
  status: CallSheetStatus;
  sentAt?: string;
  castCalls: CastCall[];
  crewCalls: CrewCall[];
  scenes: CallSheetScene[];
  schedule?: { id: string; project?: { name: string } };
  shootDay?: { dayNumber: number };
  createdBy?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CastCall {
  id: string;
  callSheetId: string;
  order: number;
  castNumber?: string;
  actorName: string;
  character?: string;
  pickupTime?: string;
  callTime: string;
  onSetTime?: string;
  notes?: string;
  status: CallStatus;
}

export interface CrewCall {
  id: string;
  callSheetId: string;
  order: number;
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CallSheetScene {
  id: string;
  callSheetId: string;
  order: number;
  sceneNumber: string;
  sceneName?: string;
  intExt?: string;
  dayNight?: string;
  location?: string;
  pageCount?: number;
  castIds?: string;
  description?: string;
}

export interface CreateCallSheetDto {
  scheduleId: string;
  shootDayId: string;
  shootDate: string;
  productionName?: string;
  generalCallTime?: string;
}

export interface CreateCastCallDto {
  actorName: string;
  character?: string;
  callTime: string;
  castNumber?: string;
  pickupTime?: string;
  onSetTime?: string;
  notes?: string;
}

export interface CreateCrewCallDto {
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone?: string;
  email?: string;
  notes?: string;
}
```

---

## Task 2: Create Constants

### File: `constants/departments.ts`
```typescript
export const DEPARTMENTS = [
  { value: 'Production', label: 'Production' },
  { value: 'Director', label: 'Director' },
  { value: 'Camera', label: 'Camera' },
  { value: 'Sound', label: 'Sound' },
  { value: 'Lighting', label: 'Lighting / Grip' },
  { value: 'Art', label: 'Art Department' },
  { value: 'Wardrobe', label: 'Wardrobe' },
  { value: 'Makeup', label: 'Hair & Makeup' },
  { value: 'Script', label: 'Script' },
  { value: 'Locations', label: 'Locations' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Catering', label: 'Catering' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Other', label: 'Other' },
];

export const COMMON_POSITIONS: Record<string, string[]> = {
  Production: ['Producer', 'Line Producer', 'Production Manager', 'Production Coordinator', 'PA'],
  Director: ['Director', '1st AD', '2nd AD', '2nd 2nd AD'],
  Camera: ['DP', 'Camera Operator', '1st AC', '2nd AC', 'DIT', 'Steadicam Op'],
  Sound: ['Sound Mixer', 'Boom Operator', 'Sound Utility'],
  Lighting: ['Gaffer', 'Best Boy Electric', 'Electric', 'Key Grip', 'Best Boy Grip', 'Grip', 'Dolly Grip'],
  Art: ['Production Designer', 'Art Director', 'Set Decorator', 'Prop Master', 'Set Dresser'],
  Wardrobe: ['Costume Designer', 'Wardrobe Supervisor', 'Costumer'],
  Makeup: ['Makeup Artist', 'Hair Stylist', 'SFX Makeup'],
  Script: ['Script Supervisor'],
  Locations: ['Location Manager', 'Location Scout', 'Location PA'],
  Transport: ['Transportation Coordinator', 'Driver'],
  Catering: ['Craft Services', 'Caterer'],
  Safety: ['Medic', 'Safety Coordinator', 'Stunt Coordinator'],
};

export const CALL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'default',
  CONFIRMED: 'processing',
  ON_SET: 'success',
  WRAPPED: 'default',
};
```

---

## Task 3: Create API Service

### File: `services/callSheets.ts`
```typescript
import { apiClient } from '../config/api';
import type { CallSheet, CreateCallSheetDto, CreateCastCallDto, CreateCrewCallDto } from '../types/callSheet';

export const callSheetsApi = {
  getBySchedule: async (scheduleId: string): Promise<CallSheet[]> => {
    const res = await apiClient.get(`/call-sheets?scheduleId=${scheduleId}`);
    return res.data.data;
  },

  getById: async (id: string): Promise<CallSheet> => {
    const res = await apiClient.get(`/call-sheets/${id}`);
    return res.data.data;
  },

  create: async (dto: CreateCallSheetDto): Promise<CallSheet> => {
    const res = await apiClient.post('/call-sheets', dto);
    return res.data.data;
  },

  update: async (id: string, dto: Partial<CallSheet>): Promise<CallSheet> => {
    const res = await apiClient.put(`/call-sheets/${id}`, dto);
    return res.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/${id}`);
  },

  // Cast
  addCast: async (callSheetId: string, dto: CreateCastCallDto): Promise<void> => {
    await apiClient.post(`/call-sheets/${callSheetId}/cast`, dto);
  },

  updateCast: async (id: string, dto: Partial<CreateCastCallDto>): Promise<void> => {
    await apiClient.put(`/call-sheets/cast/${id}`, dto);
  },

  removeCast: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/cast/${id}`);
  },

  // Crew
  addCrew: async (callSheetId: string, dto: CreateCrewCallDto): Promise<void> => {
    await apiClient.post(`/call-sheets/${callSheetId}/crew`, dto);
  },

  updateCrew: async (id: string, dto: Partial<CreateCrewCallDto>): Promise<void> => {
    await apiClient.put(`/call-sheets/crew/${id}`, dto);
  },

  removeCrew: async (id: string): Promise<void> => {
    await apiClient.delete(`/call-sheets/crew/${id}`);
  },
};
```

---

## Task 4: Create Editor Page

### File: `pages/CallSheetEditorPage.tsx`
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App, Empty, Tabs, Row, Col, Card } from 'antd';
import { LeftOutlined, FilePdfOutlined, SendOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../services/callSheets';
import CallSheetHeader from '../components/call-sheet/CallSheetHeader';
import CastCallTable from '../components/call-sheet/CastCallTable';
import CrewCallTable from '../components/call-sheet/CrewCallTable';
import SceneScheduleTable from '../components/call-sheet/SceneScheduleTable';
import LocationCard from '../components/call-sheet/LocationCard';
import WeatherCard from '../components/call-sheet/WeatherCard';
import NotesSection from '../components/call-sheet/NotesSection';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function CallSheetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const { data: callSheet, isLoading } = useQuery({
    queryKey: ['call-sheet', id],
    queryFn: () => callSheetsApi.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<typeof callSheet>) => callSheetsApi.update(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Saved');
    },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />;
  if (!callSheet) return <Empty description="Call sheet not found" />;

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
        <Space size="large">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>Call Sheet #{callSheet.callSheetNumber}</Title>
            <Text type="secondary">{dayjs(callSheet.shootDate).format('dddd, MMMM D, YYYY')}</Text>
          </div>
        </Space>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/call-sheets/${id}/view`)}>Preview</Button>
          <Button icon={<FilePdfOutlined />} onClick={() => window.open(`/api/call-sheets/${id}/export/pdf`, '_blank')}>Export PDF</Button>
          <Button icon={<SendOutlined />} type="primary">Send Call Sheet</Button>
        </Space>
      </Header>

      <Content style={{ padding: 24 }}>
        <Row gutter={[24, 24]}>
          {/* Left Column - Main Content */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <CallSheetHeader callSheet={callSheet} onUpdate={(dto) => updateMutation.mutate(dto)} />
              <SceneScheduleTable callSheetId={id!} scenes={callSheet.scenes} />
              <CastCallTable callSheetId={id!} castCalls={callSheet.castCalls} />
              <CrewCallTable callSheetId={id!} crewCalls={callSheet.crewCalls} />
            </Space>
          </Col>

          {/* Right Column - Info Cards */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <LocationCard callSheet={callSheet} onUpdate={(dto) => updateMutation.mutate(dto)} />
              <WeatherCard callSheet={callSheet} onUpdate={(dto) => updateMutation.mutate(dto)} />
              <NotesSection callSheet={callSheet} onUpdate={(dto) => updateMutation.mutate(dto)} />
            </Space>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
```

---

## Task 5: Create CallSheetHeader Component

### File: `components/call-sheet/CallSheetHeader.tsx`
```typescript
import { Card, Form, Input, TimePicker, Row, Col, Divider } from 'antd';
import dayjs from 'dayjs';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function CallSheetHeader({ callSheet, onUpdate }: Props) {
  const handleTimeChange = (field: string, time: dayjs.Dayjs | null) => {
    onUpdate({ [field]: time?.format('h:mm A') || null });
  };

  return (
    <Card title="Production Info">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Form.Item label="Production Name" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.productionName || ''}
              onChange={(e) => onUpdate({ productionName: e.target.value })}
              placeholder="Production name"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Director" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.director || ''}
              onChange={(e) => onUpdate({ director: e.target.value })}
              placeholder="Director"
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="Producer" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.producer || ''}
              onChange={(e) => onUpdate({ producer: e.target.value })}
              placeholder="Producer"
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Form.Item label="General Call" style={{ marginBottom: 0 }}>
            <TimePicker
              value={callSheet.generalCallTime ? dayjs(callSheet.generalCallTime, 'h:mm A') : null}
              onChange={(time) => handleTimeChange('generalCallTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 7:00 AM"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="First Shot" style={{ marginBottom: 0 }}>
            <TimePicker
              value={callSheet.firstShotTime ? dayjs(callSheet.firstShotTime, 'h:mm A') : null}
              onChange={(time) => handleTimeChange('firstShotTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 8:00 AM"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Est. Wrap" style={{ marginBottom: 0 }}>
            <TimePicker
              value={callSheet.wrapTime ? dayjs(callSheet.wrapTime, 'h:mm A') : null}
              onChange={(time) => handleTimeChange('wrapTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 7:00 PM"
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
```

---

## Task 6: Create CastCallTable Component

### File: `components/call-sheet/CastCallTable.tsx`
```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Space, Popconfirm, App, TimePicker, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import { CALL_STATUS_COLORS } from '../../constants/departments';
import type { CastCall, CreateCastCallDto } from '../../types/callSheet';
import AddCastModal from './AddCastModal';

interface Props {
  callSheetId: string;
  castCalls: CastCall[];
}

export default function CastCallTable({ callSheetId, castCalls }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CastCall> }) =>
      callSheetsApi.updateCast(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.removeCast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Cast member removed');
    },
  });

  const columns = [
    {
      title: '#',
      dataIndex: 'castNumber',
      width: 50,
      render: (val: string, record: CastCall) => (
        <Input
          value={val}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { castNumber: e.target.value } })}
          style={{ width: 40 }}
          size="small"
        />
      ),
    },
    {
      title: 'Actor',
      dataIndex: 'actorName',
      render: (val: string, record: CastCall) => (
        <Input
          value={val}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { actorName: e.target.value } })}
          size="small"
        />
      ),
    },
    {
      title: 'Character',
      dataIndex: 'character',
      render: (val: string, record: CastCall) => (
        <Input
          value={val || ''}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { character: e.target.value } })}
          size="small"
        />
      ),
    },
    {
      title: 'Pickup',
      dataIndex: 'pickupTime',
      width: 100,
      render: (val: string, record: CastCall) => (
        <TimePicker
          value={val ? dayjs(val, 'h:mm A') : null}
          onChange={(time) => updateMutation.mutate({ id: record.id, dto: { pickupTime: time?.format('h:mm A') } })}
          format="h:mm A"
          use12Hours
          size="small"
        />
      ),
    },
    {
      title: 'Call Time',
      dataIndex: 'callTime',
      width: 100,
      render: (val: string, record: CastCall) => (
        <TimePicker
          value={val ? dayjs(val, 'h:mm A') : null}
          onChange={(time) => updateMutation.mutate({ id: record.id, dto: { callTime: time?.format('h:mm A') || val } })}
          format="h:mm A"
          use12Hours
          size="small"
        />
      ),
    },
    {
      title: 'On Set',
      dataIndex: 'onSetTime',
      width: 100,
      render: (val: string, record: CastCall) => (
        <TimePicker
          value={val ? dayjs(val, 'h:mm A') : null}
          onChange={(time) => updateMutation.mutate({ id: record.id, dto: { onSetTime: time?.format('h:mm A') } })}
          format="h:mm A"
          use12Hours
          size="small"
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (val: string, record: CastCall) => (
        <Select
          value={val}
          onChange={(status) => updateMutation.mutate({ id: record.id, dto: { status } })}
          size="small"
          style={{ width: 100 }}
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'ON_SET', label: 'On Set' },
            { value: 'WRAPPED', label: 'Wrapped' },
          ]}
        />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: any, record: CastCall) => (
        <Popconfirm title="Remove?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="Cast"
      extra={<Button icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>Add Cast</Button>}
    >
      <Table
        columns={columns}
        dataSource={castCalls}
        rowKey="id"
        pagination={false}
        size="small"
      />

      <AddCastModal
        open={addModalOpen}
        callSheetId={callSheetId}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
          setAddModalOpen(false);
        }}
      />
    </Card>
  );
}
```

---

## Task 7: Create CrewCallTable Component

### File: `components/call-sheet/CrewCallTable.tsx`
```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Button, Popconfirm, App, TimePicker, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import { DEPARTMENTS, COMMON_POSITIONS } from '../../constants/departments';
import type { CrewCall, CreateCrewCallDto } from '../../types/callSheet';

interface Props {
  callSheetId: string;
  crewCalls: CrewCall[];
}

export default function CrewCallTable({ callSheetId, crewCalls }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [adding, setAdding] = useState(false);
  const [newCrew, setNewCrew] = useState<Partial<CreateCrewCallDto>>({});

  const addMutation = useMutation({
    mutationFn: (dto: CreateCrewCallDto) => callSheetsApi.addCrew(callSheetId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      setAdding(false);
      setNewCrew({});
      message.success('Crew added');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CrewCall> }) =>
      callSheetsApi.updateCrew(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: callSheetsApi.removeCrew,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', callSheetId] });
      message.success('Crew removed');
    },
  });

  // Group by department
  const groupedCrew = crewCalls.reduce((acc, crew) => {
    if (!acc[crew.department]) acc[crew.department] = [];
    acc[crew.department].push(crew);
    return acc;
  }, {} as Record<string, CrewCall[]>);

  const columns = [
    {
      title: 'Position',
      dataIndex: 'position',
      render: (val: string, record: CrewCall) => (
        <Input
          value={val}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { position: e.target.value } })}
          size="small"
        />
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      render: (val: string, record: CrewCall) => (
        <Input
          value={val}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { name: e.target.value } })}
          size="small"
        />
      ),
    },
    {
      title: 'Call Time',
      dataIndex: 'callTime',
      width: 100,
      render: (val: string, record: CrewCall) => (
        <TimePicker
          value={val ? dayjs(val, 'h:mm A') : null}
          onChange={(time) => updateMutation.mutate({ id: record.id, dto: { callTime: time?.format('h:mm A') || val } })}
          format="h:mm A"
          use12Hours
          size="small"
        />
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 120,
      render: (val: string, record: CrewCall) => (
        <Input
          value={val || ''}
          onChange={(e) => updateMutation.mutate({ id: record.id, dto: { phone: e.target.value } })}
          size="small"
          placeholder="Phone"
        />
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: any, record: CrewCall) => (
        <Popconfirm title="Remove?" onConfirm={() => deleteMutation.mutate(record.id)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card
      title="Crew"
      extra={<Button icon={<PlusOutlined />} onClick={() => setAdding(true)}>Add Crew</Button>}
    >
      {adding && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Select
              value={newCrew.department}
              onChange={(v) => setNewCrew({ ...newCrew, department: v })}
              options={DEPARTMENTS}
              placeholder="Department"
              style={{ width: 150 }}
            />
            <Select
              value={newCrew.position}
              onChange={(v) => setNewCrew({ ...newCrew, position: v })}
              options={(COMMON_POSITIONS[newCrew.department || ''] || []).map(p => ({ value: p, label: p }))}
              placeholder="Position"
              style={{ width: 150 }}
              showSearch
              allowClear
            />
            <Input
              value={newCrew.name || ''}
              onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
              placeholder="Name"
              style={{ width: 150 }}
            />
            <TimePicker
              value={newCrew.callTime ? dayjs(newCrew.callTime, 'h:mm A') : null}
              onChange={(time) => setNewCrew({ ...newCrew, callTime: time?.format('h:mm A') })}
              format="h:mm A"
              use12Hours
              placeholder="Call time"
            />
            <Button
              type="primary"
              onClick={() => {
                if (newCrew.department && newCrew.position && newCrew.name && newCrew.callTime) {
                  addMutation.mutate(newCrew as CreateCrewCallDto);
                }
              }}
              disabled={!newCrew.department || !newCrew.position || !newCrew.name || !newCrew.callTime}
            >
              Add
            </Button>
            <Button onClick={() => { setAdding(false); setNewCrew({}); }}>Cancel</Button>
          </div>
        </div>
      )}

      {Object.entries(groupedCrew).map(([dept, crew]) => (
        <div key={dept} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1f2937' }}>{dept}</div>
          <Table
            columns={columns}
            dataSource={crew}
            rowKey="id"
            pagination={false}
            size="small"
            showHeader={false}
          />
        </div>
      ))}
    </Card>
  );
}
```

---

## Task 8: Create LocationCard Component

### File: `components/call-sheet/LocationCard.tsx`
```typescript
import { Card, Form, Input, Button } from 'antd';
import { EnvironmentOutlined, CarOutlined, LinkOutlined } from '@ant-design/icons';
import type { CallSheet } from '../../types/callSheet';

const { TextArea } = Input;

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function LocationCard({ callSheet, onUpdate }: Props) {
  return (
    <Card title={<><EnvironmentOutlined /> Location</>}>
      <Form.Item label="Location Name" style={{ marginBottom: 12 }}>
        <Input
          value={callSheet.locationName || ''}
          onChange={(e) => onUpdate({ locationName: e.target.value })}
          placeholder="e.g., Sunset Beach"
        />
      </Form.Item>
      <Form.Item label="Address" style={{ marginBottom: 12 }}>
        <TextArea
          value={callSheet.locationAddress || ''}
          onChange={(e) => onUpdate({ locationAddress: e.target.value })}
          rows={2}
          placeholder="Full address"
        />
      </Form.Item>
      <Form.Item label="Map URL" style={{ marginBottom: 12 }}>
        <Input
          value={callSheet.mapUrl || ''}
          onChange={(e) => onUpdate({ mapUrl: e.target.value })}
          placeholder="Google Maps link"
          prefix={<LinkOutlined />}
        />
      </Form.Item>
      <Form.Item label={<><CarOutlined /> Parking Notes</>} style={{ marginBottom: 0 }}>
        <TextArea
          value={callSheet.parkingNotes || ''}
          onChange={(e) => onUpdate({ parkingNotes: e.target.value })}
          rows={2}
          placeholder="Where to park, permits needed, etc."
        />
      </Form.Item>
    </Card>
  );
}
```

---

## Task 9: Create WeatherCard Component

### File: `components/call-sheet/WeatherCard.tsx`
```typescript
import { Card, Form, Input, InputNumber, Row, Col } from 'antd';
import { CloudOutlined } from '@ant-design/icons';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function WeatherCard({ callSheet, onUpdate }: Props) {
  return (
    <Card title={<><CloudOutlined /> Weather</>}>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="High" style={{ marginBottom: 8 }}>
            <InputNumber
              value={callSheet.weatherHigh}
              onChange={(v) => onUpdate({ weatherHigh: v || undefined })}
              suffix="°F"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Low" style={{ marginBottom: 8 }}>
            <InputNumber
              value={callSheet.weatherLow}
              onChange={(v) => onUpdate({ weatherLow: v || undefined })}
              suffix="°F"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Condition" style={{ marginBottom: 8 }}>
        <Input
          value={callSheet.weatherCondition || ''}
          onChange={(e) => onUpdate({ weatherCondition: e.target.value })}
          placeholder="e.g., Partly Cloudy"
        />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Sunrise" style={{ marginBottom: 0 }}>
            <Input
              value={callSheet.sunrise || ''}
              onChange={(e) => onUpdate({ sunrise: e.target.value })}
              placeholder="6:15 AM"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Sunset" style={{ marginBottom: 0 }}>
            <Input
              value={callSheet.sunset || ''}
              onChange={(e) => onUpdate({ sunset: e.target.value })}
              placeholder="7:45 PM"
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
```

---

## Task 10: Add Routes

### File: `App.tsx` or routes config

Add routes:
```typescript
import CallSheetEditorPage from './pages/CallSheetEditorPage';
import CallSheetViewPage from './pages/CallSheetViewPage';

// In routes array:
{ path: '/call-sheets/:id', element: <CallSheetEditorPage /> }
{ path: '/call-sheets/:id/view', element: <CallSheetViewPage /> }
```

---

## Verification

1. Navigate to shooting schedule
2. Click "Create Call Sheet" on a shoot day
3. Add cast members with call times
4. Add crew by department
5. Fill in location and weather info
6. Export to PDF
