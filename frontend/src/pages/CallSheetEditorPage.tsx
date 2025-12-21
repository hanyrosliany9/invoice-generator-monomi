import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Button,
  Space,
  Spin,
  Typography,
  App,
  Empty,
  Input,
  TimePicker,
  Tag,
  Popconfirm,
  Form,
  Modal,
  Select,
} from 'antd';
import {
  LeftOutlined,
  FilePdfOutlined,
  SendOutlined,
  EyeOutlined,
  PlusOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  CloudOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { callSheetsApi } from '../services/callSheets';
import { DEPARTMENTS, COMMON_POSITIONS, CALL_STATUS_COLORS } from '../constants/departments';
import type { CallSheet, CastCall, CrewCall, CallSheetScene, CreateCastCallDto, CreateCrewCallDto } from '../types/callSheet';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function CallSheetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

  const [addCastModalOpen, setAddCastModalOpen] = useState(false);
  const [addCrewModalOpen, setAddCrewModalOpen] = useState(false);
  const [castForm] = Form.useForm();
  const [crewForm] = Form.useForm();
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const { data: callSheet, isLoading } = useQuery({
    queryKey: ['call-sheet', id],
    queryFn: () => callSheetsApi.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<CallSheet>) => callSheetsApi.update(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => {
      message.error('Failed to save');
    },
  });

  const addCastMutation = useMutation({
    mutationFn: (dto: CreateCastCallDto) => callSheetsApi.addCast(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Cast member added');
      setAddCastModalOpen(false);
      castForm.resetFields();
    },
    onError: () => message.error('Failed to add cast'),
  });

  const updateCastMutation = useMutation({
    mutationFn: ({ castId, dto }: { castId: string; dto: Partial<CastCall> }) =>
      callSheetsApi.updateCast(castId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update'),
  });

  const deleteCastMutation = useMutation({
    mutationFn: callSheetsApi.removeCast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Cast member removed');
    },
    onError: () => message.error('Failed to delete'),
  });

  const addCrewMutation = useMutation({
    mutationFn: (dto: CreateCrewCallDto) => callSheetsApi.addCrew(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Crew member added');
      setAddCrewModalOpen(false);
      crewForm.resetFields();
      setSelectedDepartment(null);
    },
    onError: () => message.error('Failed to add crew'),
  });

  const updateCrewMutation = useMutation({
    mutationFn: ({ crewId, dto }: { crewId: string; dto: Partial<CrewCall> }) =>
      callSheetsApi.updateCrew(crewId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update'),
  });

  const deleteCrewMutation = useMutation({
    mutationFn: callSheetsApi.removeCrew,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Crew member removed');
    },
    onError: () => message.error('Failed to delete'),
  });

  const handleAddCast = (values: any) => {
    addCastMutation.mutate({
      actorName: values.actorName,
      character: values.character,
      callTime: values.callTime?.format('h:mm A') || '8:00 AM',
      castNumber: values.castNumber,
      pickupTime: values.pickupTime?.format('h:mm A'),
      onSetTime: values.onSetTime?.format('h:mm A'),
    });
  };

  const handleAddCrew = (values: any) => {
    addCrewMutation.mutate({
      department: values.department,
      position: values.position,
      name: values.name,
      callTime: values.callTime?.format('h:mm A') || '7:00 AM',
      phone: values.phone,
      email: values.email,
    });
  };

  if (isLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  if (!callSheet) {
    return (
      <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
        <Empty description="Call sheet not found" style={{ marginTop: 100 }} />
      </Layout>
    );
  }

  // Group crew by department
  const crewByDepartment = (callSheet.crewCalls || []).reduce((acc: Record<string, CrewCall[]>, crew) => {
    if (!acc[crew.department]) acc[crew.department] = [];
    acc[crew.department].push(crew);
    return acc;
  }, {});

  return (
    <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
      {/* Professional Header Bar */}
      <Header
        style={{
          background: `linear-gradient(90deg, ${theme.colors.accent.primary} 0%, ${theme.colors.accent.secondary} 100%)`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.colors.border.strong}`,
          height: 'auto',
          minHeight: 64,
        }}
      >
        <Space size="large">
          <Button
            icon={<LeftOutlined />}
            onClick={() => navigate('/call-sheets')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
          >
            Back
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  padding: '6px 16px',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: 1,
                }}
              >
                CALL SHEET #{callSheet.callSheetNumber}
              </span>
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                {callSheet.productionName || 'Untitled Production'}
              </Title>
            </div>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              {dayjs(callSheet.shootDate).format('dddd, MMMM D, YYYY')}
              {callSheet.shootDay && ` - Day ${callSheet.shootDay.dayNumber}`}
            </Text>
          </div>
        </Space>
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/call-sheets/${id}/view`)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
          >
            Preview
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => window.open(`/api/call-sheets/${id}/export/pdf`, '_blank')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}
          >
            Export PDF
          </Button>
          <Button
            icon={<SendOutlined />}
            type="primary"
            style={{ background: theme.colors.status.success, borderColor: theme.colors.status.success }}
          >
            Send Call Sheet
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: 0 }}>
        {/* PRODUCTION INFO SECTION */}
        <SectionHeader icon={<VideoCameraOutlined />} title="Production Info" theme={theme} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <EditableCell
            label="Production Name"
            value={callSheet.productionName || ''}
            onChange={(v) => updateMutation.mutate({ productionName: v })}
            theme={theme}
          />
          <EditableCell
            label="Director"
            value={callSheet.director || ''}
            onChange={(v) => updateMutation.mutate({ director: v })}
            theme={theme}
          />
          <EditableCell
            label="Producer"
            value={callSheet.producer || ''}
            onChange={(v) => updateMutation.mutate({ producer: v })}
            theme={theme}
          />
          <div style={{ background: theme.colors.background.primary, padding: 16 }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 4 }}>
              Status
            </div>
            <Tag color={
              callSheet.status === 'SENT' ? theme.colors.status.success :
              callSheet.status === 'READY' ? theme.colors.status.info :
              theme.colors.text.secondary
            }>
              {callSheet.status}
            </Tag>
          </div>
        </div>

        {/* TIMES SECTION */}
        <SectionHeader icon={<ClockCircleOutlined />} title="Call Times" theme={theme} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <TimeCell
            label="General Call"
            value={callSheet.generalCallTime}
            onChange={(v) => updateMutation.mutate({ generalCallTime: v })}
            theme={theme}
          />
          <TimeCell
            label="First Shot"
            value={callSheet.firstShotTime}
            onChange={(v) => updateMutation.mutate({ firstShotTime: v })}
            theme={theme}
          />
          <TimeCell
            label="Est. Wrap"
            value={callSheet.wrapTime}
            onChange={(v) => updateMutation.mutate({ wrapTime: v })}
            theme={theme}
          />
          <TimeCell
            label="Sunrise"
            value={callSheet.sunrise}
            onChange={(v) => updateMutation.mutate({ sunrise: v })}
            theme={theme}
          />
          <TimeCell
            label="Sunset"
            value={callSheet.sunset}
            onChange={(v) => updateMutation.mutate({ sunset: v })}
            theme={theme}
          />
        </div>

        {/* LOCATION & WEATHER SECTION */}
        <SectionHeader icon={<EnvironmentOutlined />} title="Location & Weather" theme={theme} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <div style={{ background: theme.colors.background.primary, padding: 16, gridRow: 'span 2' }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Location Name
            </div>
            <Input
              value={callSheet.locationName || ''}
              onChange={(e) => updateMutation.mutate({ locationName: e.target.value })}
              placeholder="Enter location name"
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address
            </div>
            <Input.TextArea
              value={callSheet.locationAddress || ''}
              onChange={(e) => updateMutation.mutate({ locationAddress: e.target.value })}
              placeholder="Enter full address"
              rows={2}
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Parking Notes
            </div>
            <Input.TextArea
              value={callSheet.parkingNotes || ''}
              onChange={(e) => updateMutation.mutate({ parkingNotes: e.target.value })}
              placeholder="Parking instructions..."
              rows={2}
            />
          </div>
          <div style={{ background: theme.colors.background.primary, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CloudOutlined style={{ fontSize: 24, color: theme.colors.accent.primary }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text.primary }}>Weather</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase' }}>High</div>
                <Input
                  value={callSheet.weatherHigh || ''}
                  onChange={(e) => updateMutation.mutate({ weatherHigh: parseInt(e.target.value) || 0 })}
                  suffix="°F"
                  style={{ width: 80 }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase' }}>Low</div>
                <Input
                  value={callSheet.weatherLow || ''}
                  onChange={(e) => updateMutation.mutate({ weatherLow: parseInt(e.target.value) || 0 })}
                  suffix="°F"
                  style={{ width: 80 }}
                />
              </div>
            </div>
          </div>
          <div style={{ background: theme.colors.background.primary, padding: 16 }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Condition
            </div>
            <Input
              value={callSheet.weatherCondition || ''}
              onChange={(e) => updateMutation.mutate({ weatherCondition: e.target.value })}
              placeholder="e.g., Sunny, Cloudy"
            />
          </div>
          <div style={{ background: theme.colors.background.primary, padding: 16, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MedicineBoxOutlined style={{ fontSize: 18, color: theme.colors.status.error }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text.primary }}>Nearest Hospital</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <Input
                  value={callSheet.nearestHospital || ''}
                  onChange={(e) => updateMutation.mutate({ nearestHospital: e.target.value })}
                  placeholder="Hospital name"
                  size="small"
                />
              </div>
              <div>
                <Input
                  value={callSheet.hospitalAddress || ''}
                  onChange={(e) => updateMutation.mutate({ hospitalAddress: e.target.value })}
                  placeholder="Address"
                  size="small"
                />
              </div>
              <div>
                <Input
                  value={callSheet.hospitalPhone || ''}
                  onChange={(e) => updateMutation.mutate({ hospitalPhone: e.target.value })}
                  placeholder="Phone"
                  size="small"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SCENE SCHEDULE SECTION */}
        <SectionHeader icon={<FileTextOutlined />} title="Scene Schedule" theme={theme} count={callSheet.scenes?.length || 0} />
        <div style={{ background: theme.colors.background.primary, borderBottom: `1px solid ${theme.colors.border.default}` }}>
          {/* Scene Table Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              background: theme.colors.background.tertiary,
              borderBottom: `1px solid ${theme.colors.border.default}`,
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.colors.text.secondary,
              letterSpacing: 1,
            }}
          >
            <div style={{ width: 80, textAlign: 'center' }}>Scene</div>
            <div style={{ width: 100, textAlign: 'center' }}>I/E</div>
            <div style={{ width: 100, textAlign: 'center' }}>D/N</div>
            <div style={{ flex: 1 }}>Description</div>
            <div style={{ width: 150 }}>Location</div>
            <div style={{ width: 80, textAlign: 'center' }}>Pages</div>
            <div style={{ width: 100 }}>Cast</div>
          </div>

          {/* Scene Rows */}
          {(!callSheet.scenes || callSheet.scenes.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.colors.text.tertiary }}>
              No scenes scheduled. Scenes are imported from the shooting schedule.
            </div>
          ) : (
            callSheet.scenes.map((scene) => (
              <div
                key={scene.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <div style={{ width: 80, textAlign: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: theme.colors.text.primary }}>
                    {scene.sceneNumber}
                  </span>
                </div>
                <div style={{ width: 100, textAlign: 'center' }}>
                  <Tag color={scene.intExt === 'EXT' ? 'green' : 'blue'}>{scene.intExt || '-'}</Tag>
                </div>
                <div style={{ width: 100, textAlign: 'center' }}>
                  <Tag color={scene.dayNight === 'NIGHT' ? 'purple' : 'gold'}>{scene.dayNight || '-'}</Tag>
                </div>
                <div style={{ flex: 1, color: theme.colors.text.primary }}>
                  {scene.sceneName || scene.description || '—'}
                </div>
                <div style={{ width: 150, color: theme.colors.text.secondary, fontSize: 12 }}>
                  {scene.location || '—'}
                </div>
                <div style={{ width: 80, textAlign: 'center', fontWeight: 600, color: theme.colors.text.primary }}>
                  {scene.pageCount?.toFixed(1) || '—'}
                </div>
                <div style={{ width: 100, color: theme.colors.text.tertiary, fontSize: 12 }}>
                  {scene.castIds || '—'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* CAST SECTION */}
        <SectionHeader
          icon={<TeamOutlined />}
          title="Cast"
          theme={theme}
          count={callSheet.castCalls?.length || 0}
          action={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddCastModalOpen(true)}
            >
              Add Cast
            </Button>
          }
        />
        <div style={{ background: theme.colors.background.primary, borderBottom: `1px solid ${theme.colors.border.default}` }}>
          {/* Cast Table Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px',
              background: theme.colors.background.tertiary,
              borderBottom: `1px solid ${theme.colors.border.default}`,
              fontWeight: 600,
              fontSize: 11,
              textTransform: 'uppercase',
              color: theme.colors.text.secondary,
              letterSpacing: 1,
            }}
          >
            <div style={{ width: 60, textAlign: 'center' }}>#</div>
            <div style={{ flex: 1 }}>Actor</div>
            <div style={{ flex: 1 }}>Character</div>
            <div style={{ width: 120, textAlign: 'center' }}>Pickup</div>
            <div style={{ width: 120, textAlign: 'center' }}>Call Time</div>
            <div style={{ width: 120, textAlign: 'center' }}>On Set</div>
            <div style={{ width: 100, textAlign: 'center' }}>Status</div>
            <div style={{ width: 60, textAlign: 'center' }}>Actions</div>
          </div>

          {/* Cast Rows */}
          {(!callSheet.castCalls || callSheet.castCalls.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.colors.text.tertiary }}>
              No cast members added yet. Click "Add Cast" to add cast members.
            </div>
          ) : (
            callSheet.castCalls.map((cast) => (
              <div
                key={cast.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  borderBottom: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <div style={{ width: 60, textAlign: 'center' }}>
                  <Input
                    value={cast.castNumber || ''}
                    onChange={(e) => updateCastMutation.mutate({ castId: cast.id, dto: { castNumber: e.target.value } })}
                    size="small"
                    style={{ width: 45, textAlign: 'center' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    value={cast.actorName}
                    onChange={(e) => updateCastMutation.mutate({ castId: cast.id, dto: { actorName: e.target.value } })}
                    size="small"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    value={cast.character || ''}
                    onChange={(e) => updateCastMutation.mutate({ castId: cast.id, dto: { character: e.target.value } })}
                    size="small"
                    placeholder="Character"
                  />
                </div>
                <div style={{ width: 120, textAlign: 'center' }}>
                  <TimePicker
                    value={cast.pickupTime ? dayjs(cast.pickupTime, 'h:mm A') : null}
                    onChange={(time) => updateCastMutation.mutate({ castId: cast.id, dto: { pickupTime: time?.format('h:mm A') || undefined } })}
                    format="h:mm A"
                    use12Hours
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="—"
                  />
                </div>
                <div style={{ width: 120, textAlign: 'center' }}>
                  <TimePicker
                    value={cast.callTime ? dayjs(cast.callTime, 'h:mm A') : null}
                    onChange={(time) => updateCastMutation.mutate({ castId: cast.id, dto: { callTime: time?.format('h:mm A') || '8:00 AM' } })}
                    format="h:mm A"
                    use12Hours
                    size="small"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ width: 120, textAlign: 'center' }}>
                  <TimePicker
                    value={cast.onSetTime ? dayjs(cast.onSetTime, 'h:mm A') : null}
                    onChange={(time) => updateCastMutation.mutate({ castId: cast.id, dto: { onSetTime: time?.format('h:mm A') || undefined } })}
                    format="h:mm A"
                    use12Hours
                    size="small"
                    style={{ width: '100%' }}
                    placeholder="—"
                  />
                </div>
                <div style={{ width: 100, textAlign: 'center' }}>
                  <Tag color={CALL_STATUS_COLORS[cast.status] || 'default'}>{cast.status}</Tag>
                </div>
                <div style={{ width: 60, textAlign: 'center' }}>
                  <Popconfirm title="Delete?" onConfirm={() => deleteCastMutation.mutate(cast.id)}>
                    <Button icon={<DeleteOutlined />} danger size="small" type="text" />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CREW SECTION */}
        <SectionHeader
          icon={<TeamOutlined />}
          title="Crew"
          theme={theme}
          count={callSheet.crewCalls?.length || 0}
          action={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddCrewModalOpen(true)}
            >
              Add Crew
            </Button>
          }
        />
        <div style={{ background: theme.colors.background.primary, borderBottom: `1px solid ${theme.colors.border.default}` }}>
          {Object.keys(crewByDepartment).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.colors.text.tertiary }}>
              No crew members added yet. Click "Add Crew" to add crew members.
            </div>
          ) : (
            Object.entries(crewByDepartment).map(([department, crewList]) => (
              <div key={department}>
                {/* Department Header */}
                <div
                  style={{
                    padding: '8px 16px',
                    background: theme.colors.background.tertiary,
                    fontWeight: 700,
                    fontSize: 12,
                    color: theme.colors.accent.primary,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    borderBottom: `1px solid ${theme.colors.border.default}`,
                  }}
                >
                  {department}
                </div>
                {/* Crew Table Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: theme.colors.background.secondary,
                    borderBottom: `1px solid ${theme.colors.border.light}`,
                    fontWeight: 600,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    color: theme.colors.text.tertiary,
                    letterSpacing: 1,
                  }}
                >
                  <div style={{ width: 180 }}>Position</div>
                  <div style={{ flex: 1 }}>Name</div>
                  <div style={{ width: 120, textAlign: 'center' }}>Call Time</div>
                  <div style={{ width: 150 }}>Phone</div>
                  <div style={{ width: 200 }}>Email</div>
                  <div style={{ width: 60, textAlign: 'center' }}>Actions</div>
                </div>
                {/* Crew Rows */}
                {crewList.map((crew) => (
                  <div
                    key={crew.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      borderBottom: `1px solid ${theme.colors.border.light}`,
                    }}
                  >
                    <div style={{ width: 180 }}>
                      <Input
                        value={crew.position}
                        onChange={(e) => updateCrewMutation.mutate({ crewId: crew.id, dto: { position: e.target.value } })}
                        size="small"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Input
                        value={crew.name}
                        onChange={(e) => updateCrewMutation.mutate({ crewId: crew.id, dto: { name: e.target.value } })}
                        size="small"
                      />
                    </div>
                    <div style={{ width: 120, textAlign: 'center' }}>
                      <TimePicker
                        value={crew.callTime ? dayjs(crew.callTime, 'h:mm A') : null}
                        onChange={(time) => updateCrewMutation.mutate({ crewId: crew.id, dto: { callTime: time?.format('h:mm A') || '7:00 AM' } })}
                        format="h:mm A"
                        use12Hours
                        size="small"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ width: 150 }}>
                      <Input
                        value={crew.phone || ''}
                        onChange={(e) => updateCrewMutation.mutate({ crewId: crew.id, dto: { phone: e.target.value } })}
                        size="small"
                        placeholder="Phone"
                      />
                    </div>
                    <div style={{ width: 200 }}>
                      <Input
                        value={crew.email || ''}
                        onChange={(e) => updateCrewMutation.mutate({ crewId: crew.id, dto: { email: e.target.value } })}
                        size="small"
                        placeholder="Email"
                      />
                    </div>
                    <div style={{ width: 60, textAlign: 'center' }}>
                      <Popconfirm title="Delete?" onConfirm={() => deleteCrewMutation.mutate(crew.id)}>
                        <Button icon={<DeleteOutlined />} danger size="small" type="text" />
                      </Popconfirm>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* NOTES SECTION */}
        <SectionHeader icon={<EditOutlined />} title="Notes" theme={theme} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <div style={{ background: theme.colors.background.primary, padding: 16 }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              General Notes
            </div>
            <Input.TextArea
              value={callSheet.generalNotes || ''}
              onChange={(e) => updateMutation.mutate({ generalNotes: e.target.value })}
              placeholder="General notes for the crew..."
              rows={4}
            />
          </div>
          <div style={{ background: theme.colors.background.primary, padding: 16 }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Production Notes
            </div>
            <Input.TextArea
              value={callSheet.productionNotes || ''}
              onChange={(e) => updateMutation.mutate({ productionNotes: e.target.value })}
              placeholder="Important production notes..."
              rows={4}
            />
          </div>
        </div>

        {/* Bottom Padding */}
        <div style={{ height: 60 }} />
      </Content>

      {/* Add Cast Modal */}
      <Modal
        title="Add Cast Member"
        open={addCastModalOpen}
        onCancel={() => {
          setAddCastModalOpen(false);
          castForm.resetFields();
        }}
        footer={null}
      >
        <Form form={castForm} layout="vertical" onFinish={handleAddCast}>
          <Form.Item name="actorName" label="Actor Name" rules={[{ required: true }]}>
            <Input placeholder="Enter actor name" />
          </Form.Item>
          <Form.Item name="character" label="Character">
            <Input placeholder="Enter character name" />
          </Form.Item>
          <Form.Item name="castNumber" label="Cast #">
            <Input placeholder="e.g., 1, 2, 3" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="pickupTime" label="Pickup Time">
              <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="callTime" label="Call Time" rules={[{ required: true }]}>
              <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="onSetTime" label="On Set Time">
              <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddCastModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={addCastMutation.isPending}>
                Add Cast Member
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Crew Modal */}
      <Modal
        title="Add Crew Member"
        open={addCrewModalOpen}
        onCancel={() => {
          setAddCrewModalOpen(false);
          crewForm.resetFields();
          setSelectedDepartment(null);
        }}
        footer={null}
      >
        <Form form={crewForm} layout="vertical" onFinish={handleAddCrew}>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select
              placeholder="Select department"
              options={DEPARTMENTS}
              onChange={(v) => {
                setSelectedDepartment(v);
                crewForm.setFieldValue('position', undefined);
              }}
            />
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
            <Select
              placeholder="Select position"
              disabled={!selectedDepartment}
              options={(COMMON_POSITIONS[selectedDepartment || ''] || []).map((p: string) => ({
                label: p,
                value: p,
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Enter crew member name" />
          </Form.Item>
          <Form.Item name="callTime" label="Call Time" rules={[{ required: true }]}>
            <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="Phone number" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="Email address" />
            </Form.Item>
          </div>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddCrewModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={addCrewMutation.isPending}>
                Add Crew Member
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

// Helper Components
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  theme: any;
  count?: number;
  action?: React.ReactNode;
}

function SectionHeader({ icon, title, theme, count, action }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: `linear-gradient(90deg, ${theme.colors.accent.primary} 0%, ${theme.colors.accent.secondary} 100%)`,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </span>
        {count !== undefined && (
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

interface EditableCellProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: any;
}

function EditableCell({ label, value, onChange, theme }: EditableCellProps) {
  return (
    <div style={{ background: theme.colors.background.primary, padding: 16 }}>
      <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}

interface TimeCellProps {
  label: string;
  value?: string | null;
  onChange: (value: string | undefined) => void;
  theme: any;
}

function TimeCell({ label, value, onChange, theme }: TimeCellProps) {
  return (
    <div style={{ background: theme.colors.background.primary, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <TimePicker
        value={value ? dayjs(value, 'h:mm A') : null}
        onChange={(time) => onChange(time?.format('h:mm A') || undefined)}
        format="h:mm A"
        use12Hours
        style={{ width: '100%' }}
        placeholder="—"
      />
    </div>
  );
}
