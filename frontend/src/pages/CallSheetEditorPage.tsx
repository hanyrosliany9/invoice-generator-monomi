import { useState, useEffect, useRef } from 'react';
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
  Dropdown,
  Tooltip,
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
  ThunderboltOutlined,
  ReloadOutlined,
  SearchOutlined,
  DownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../theme';
import { callSheetsApi } from '../services/callSheets';
import { exportPdfWithAuth } from '../utils/exportPdfWithAuth';
import { DEPARTMENTS, COMMON_POSITIONS, CALL_STATUS_COLORS } from '../constants/departments';
import { PdfPreviewModal } from '../components/common/PdfPreviewModal';
import { AddressAutocomplete } from '../components/common/AddressAutocomplete';
import { CastStatusBadge } from '../components/callsheet/CastStatusBadge';
import { ShotListSection } from '../components/callsheet/ShotListSection';
import { ModelsSection } from '../components/callsheet/ModelsSection';
import { WardrobeSection } from '../components/callsheet/WardrobeSection';
import { HMUScheduleSection } from '../components/callsheet/HMUScheduleSection';
// FILM-specific sections (restored)
import { KeyTimesBar } from '../components/callsheet/KeyTimesBar';
import { DayScheduleTimeline } from '../components/callsheet/DayScheduleTimeline';
import { MealBreaksSection } from '../components/callsheet/MealBreaksSection';
import { CompanyMovesSection } from '../components/callsheet/CompanyMovesSection';
import { BackgroundCallsSection } from '../components/callsheet/BackgroundCallsSection';
import { SpecialRequirementsSection } from '../components/callsheet/SpecialRequirementsSection';
import { ActivitiesSection } from '../components/callsheet/ActivitiesSection';
import type {
  CallSheet,
  CastCall,
  CrewCall,
  CallSheetScene,
  CreateCastCallDto,
  CreateCrewCallDto,
  CallSheetType,
} from '../types/callSheet';

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
  const [addSceneModalOpen, setAddSceneModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [hospitalSearchModalOpen, setHospitalSearchModalOpen] = useState(false);
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: string; name: string; address: string; phone: string; distance: number }>>([]);
  const [castForm] = Form.useForm();
  const [crewForm] = Form.useForm();
  const [sceneForm] = Form.useForm();
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

  // Scene mutations
  const addSceneMutation = useMutation({
    mutationFn: (dto: any) => callSheetsApi.addScene(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Scene added successfully');
      setAddSceneModalOpen(false);
      sceneForm.resetFields();
    },
    onError: () => message.error('Failed to add scene'),
  });

  const deleteSceneMutation = useMutation({
    mutationFn: callSheetsApi.removeScene,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Scene removed');
    },
    onError: () => message.error('Failed to delete scene'),
  });

  // Auto-fill mutations
  const autoFillAllMutation = useMutation({
    mutationFn: () => callSheetsApi.autoFillAll(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Call sheet auto-filled successfully!');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Auto-fill failed');
    },
  });

  const autoFillWeatherMutation = useMutation({
    mutationFn: () => callSheetsApi.autoFillWeather(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Weather data updated');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Weather fetch failed');
    },
  });

  const autoFillSunTimesMutation = useMutation({
    mutationFn: () => callSheetsApi.autoFillSunTimes(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Sun times updated');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Sun times fetch failed');
    },
  });

  const autoFillHospitalMutation = useMutation({
    mutationFn: () => callSheetsApi.autoFillHospital(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Hospital information updated');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Hospital search failed');
    },
  });

  const searchHospitalsMutation = useMutation({
    mutationFn: () => callSheetsApi.searchHospitals(id!),
    onSuccess: (data) => {
      setHospitalOptions(data);
      if (data.length > 0) {
        setHospitalSearchModalOpen(true);
      } else {
        message.warning('No hospitals found in this area');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Hospital search failed');
    },
  });

  // === FILM-SPECIFIC MUTATIONS ===

  // Meal mutations
  const addMealMutation = useMutation({
    mutationFn: (dto: any) => callSheetsApi.addMeal(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Meal added');
    },
    onError: () => message.error('Failed to add meal'),
  });

  const updateMealMutation = useMutation({
    mutationFn: ({ mealId, dto }: { mealId: string; dto: any }) =>
      callSheetsApi.updateMeal(mealId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update meal'),
  });

  const deleteMealMutation = useMutation({
    mutationFn: callSheetsApi.removeMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Meal removed');
    },
    onError: () => message.error('Failed to delete meal'),
  });

  // Company Move mutations
  const addMoveMutation = useMutation({
    mutationFn: (dto: any) => callSheetsApi.addMove(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Company move added');
    },
    onError: () => message.error('Failed to add company move'),
  });

  const updateMoveMutation = useMutation({
    mutationFn: ({ moveId, dto }: { moveId: string; dto: any }) =>
      callSheetsApi.updateMove(moveId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update company move'),
  });

  const deleteMoveMutation = useMutation({
    mutationFn: callSheetsApi.removeMove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Company move removed');
    },
    onError: () => message.error('Failed to delete company move'),
  });

  // Background/Extras mutations
  const addBackgroundMutation = useMutation({
    mutationFn: (dto: any) => callSheetsApi.addBackground(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Background call added');
    },
    onError: () => message.error('Failed to add background call'),
  });

  const updateBackgroundMutation = useMutation({
    mutationFn: ({ backgroundId, dto }: { backgroundId: string; dto: any }) =>
      callSheetsApi.updateBackground(backgroundId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update background call'),
  });

  const deleteBackgroundMutation = useMutation({
    mutationFn: callSheetsApi.removeBackground,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Background call removed');
    },
    onError: () => message.error('Failed to delete background call'),
  });

  // Special Requirements mutations
  const addSpecialReqMutation = useMutation({
    mutationFn: (dto: any) => callSheetsApi.addSpecialReq(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Special requirement added');
    },
    onError: () => message.error('Failed to add special requirement'),
  });

  const updateSpecialReqMutation = useMutation({
    mutationFn: ({ reqId, dto }: { reqId: string; dto: any }) =>
      callSheetsApi.updateSpecialReq(reqId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
    },
    onError: () => message.error('Failed to update special requirement'),
  });

  const deleteSpecialReqMutation = useMutation({
    mutationFn: callSheetsApi.removeSpecialReq,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Special requirement removed');
    },
    onError: () => message.error('Failed to delete special requirement'),
  });

  const handleSelectHospital = (hospital: any) => {
    updateMutation.mutate({
      nearestHospital: hospital.name,
      hospitalAddress: hospital.address,
      hospitalPhone: hospital.phone,
    });
    setHospitalSearchModalOpen(false);
  };

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

  const handleAddScene = (values: any) => {
    addSceneMutation.mutate({
      sceneNumber: values.sceneNumber,
      sceneName: values.sceneName,
      intExt: values.intExt,
      dayNight: values.dayNight,
      location: values.location,
      pageCount: values.pageCount ? parseFloat(values.pageCount) : undefined,
      castIds: values.castIds,
      description: values.description,
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
          background: '#1e293b',
          borderLeft: `4px solid ${theme.colors.accent.primary}`,
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
            icon={<FilePdfOutlined />}
            onClick={() => setPdfModalOpen(true)}
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
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <TimeCell
            label="Crew Call"
            value={callSheet.crewCallTime || callSheet.generalCallTime}
            onChange={(v) => updateMutation.mutate({ crewCallTime: v })}
            theme={theme}
          />
          <TimeCell
            label="First Shot"
            value={callSheet.firstShotTime}
            onChange={(v) => updateMutation.mutate({ firstShotTime: v })}
            theme={theme}
          />
          <TimeCell
            label="Lunch"
            value={callSheet.lunchTime}
            onChange={(v) => updateMutation.mutate({ lunchTime: v })}
            theme={theme}
          />
          <TimeCell
            label="Est. Wrap"
            value={callSheet.estimatedWrap || callSheet.wrapTime}
            onChange={(v) => updateMutation.mutate({ estimatedWrap: v })}
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

        {/* Auto-Fill Button Area */}
        <div
          style={{
            background: theme.colors.background.primary,
            padding: 12,
            borderBottom: `1px solid ${theme.colors.border.default}`,
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Tooltip
            title={!callSheet?.locationAddress
              ? 'Enter a location address first'
              : 'Auto-fill all weather, sun times, and hospital data'
            }
          >
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => autoFillAllMutation.mutate()}
              loading={autoFillAllMutation.isPending}
              disabled={!callSheet?.locationAddress}
            >
              Auto-Fill All Data
            </Button>
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'weather',
                  label: 'Fetch Weather',
                  icon: <CloudOutlined />,
                  onClick: () => autoFillWeatherMutation.mutate(),
                },
                {
                  key: 'suntimes',
                  label: 'Fetch Sun Times',
                  icon: <ReloadOutlined />,
                  onClick: () => autoFillSunTimesMutation.mutate(),
                },
                {
                  key: 'hospital',
                  label: 'Find Hospitals',
                  icon: <SearchOutlined />,
                  onClick: () => searchHospitalsMutation.mutate(),
                },
              ],
            }}
            disabled={!callSheet?.locationAddress}
          >
            <Button icon={<DownOutlined />}>
              Auto-Fill Individual
            </Button>
          </Dropdown>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 1,
            background: theme.colors.border.default,
            borderBottom: `1px solid ${theme.colors.border.default}`,
          }}
        >
          <div style={{
            background: theme.colors.background.primary,
            padding: 16,
            gridRow: 'span 2',
            position: 'relative',  // Establishes stacking context
            zIndex: 10,            // Higher than sibling grid cells
          }}>
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Location Name
            </div>
            <Input
              defaultValue={callSheet.locationName || ''}
              onBlur={(e) => {
                if (e.target.value !== callSheet.locationName) {
                  updateMutation.mutate({ locationName: e.target.value });
                }
              }}
              placeholder="Enter location name"
              style={{ marginBottom: 12 }}
            />
            <div style={{ fontSize: 10, color: theme.colors.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>
              Address (Indonesia)
            </div>
            <AddressAutocomplete
              value={callSheet.locationAddress || ''}
              onChange={(address, coords) => {
                updateMutation.mutate({ locationAddress: address });
                // If we got coordinates, could auto-fill weather/hospital
                if (coords) {
                  console.log('Address selected with coords:', coords);
                  // Optionally trigger auto-fill after selection
                  setTimeout(() => {
                    if (!autoFillAllMutation.isPending) {
                      autoFillAllMutation.mutate();
                    }
                  }, 500);
                }
              }}
              placeholder="Ketik alamat... (contoh: Jakarta, Bandung)"
            />
            <div style={{ height: 12 }} /> {/* Spacer */}
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
        <SectionHeader
          icon={<FileTextOutlined />}
          title="Scene Schedule"
          theme={theme}
          count={callSheet.scenes?.length || 0}
          action={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddSceneModalOpen(true)}
            >
              Add Scene
            </Button>
          }
        />
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
            <div style={{ width: 50, textAlign: 'center' }}>Action</div>
          </div>

          {/* Scene Rows */}
          {(!callSheet.scenes || callSheet.scenes.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', color: theme.colors.text.tertiary }}>
              No scenes added yet. Add scenes using the + button above.
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
                <div style={{ width: 50, textAlign: 'center' }}>
                  <Popconfirm title="Delete?" onConfirm={() => deleteSceneMutation.mutate(scene.id)}>
                    <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ACTIVITIES SECTION (Run of Show) */}
        <SectionHeader
          icon={<ClockCircleOutlined />}
          title="Schedule / Activities"
          theme={theme}
          count={callSheet.activities?.length || 0}
        />
        <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
          <ActivitiesSection
            activities={callSheet.activities || []}
            callSheetId={id!}
            theme={theme}
          />
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

        {/* FILM-SPECIFIC SECTIONS */}
        {(!callSheet.callSheetType || callSheet.callSheetType === 'FILM') && (
          <>
            {/* KEY TIMES BAR */}
            <KeyTimesBar
              crewCallTime={callSheet.crewCallTime}
              firstShotTime={callSheet.firstShotTime}
              lunchTime={callSheet.lunchTime}
              estimatedWrap={callSheet.estimatedWrap}
              onUpdate={(field, value) => updateMutation.mutate({ [field]: value })}
            />

            {/* DAY SCHEDULE TIMELINE */}
            <DayScheduleTimeline
              crewCallTime={callSheet.crewCallTime}
              firstShotTime={callSheet.firstShotTime}
              estimatedWrap={callSheet.estimatedWrap}
              meals={callSheet.mealBreaks}
              moves={callSheet.companyMoves}
            />

            {/* MEAL BREAKS SECTION */}
            <SectionHeader icon={<ClockCircleOutlined />} title="Meal Breaks" theme={theme} count={callSheet.mealBreaks?.length || 0} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <MealBreaksSection
                meals={callSheet.mealBreaks || []}
                callSheetId={id!}
                onAdd={async (dto) => { await addMealMutation.mutateAsync(dto); }}
                onUpdate={async (mealId, dto) => { await updateMealMutation.mutateAsync({ mealId, dto }); }}
                onDelete={async (mealId) => { await deleteMealMutation.mutateAsync(mealId); }}
              />
            </div>

            {/* COMPANY MOVES SECTION */}
            <SectionHeader icon={<EnvironmentOutlined />} title="Company Moves" theme={theme} count={callSheet.companyMoves?.length || 0} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <CompanyMovesSection
                moves={callSheet.companyMoves || []}
                callSheetId={id!}
                onAdd={async (dto) => { await addMoveMutation.mutateAsync(dto); }}
                onUpdate={async (moveId, dto) => { await updateMoveMutation.mutateAsync({ moveId, dto }); }}
                onDelete={async (moveId) => { await deleteMoveMutation.mutateAsync(moveId); }}
              />
            </div>

            {/* BACKGROUND/EXTRAS SECTION */}
            <SectionHeader icon={<TeamOutlined />} title="Background / Extras" theme={theme} count={callSheet.backgroundCalls?.length || 0} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <BackgroundCallsSection
                backgroundCalls={callSheet.backgroundCalls || []}
                callSheetId={id!}
                onAdd={async (dto) => { await addBackgroundMutation.mutateAsync(dto); }}
                onUpdate={async (backgroundId, dto) => { await updateBackgroundMutation.mutateAsync({ backgroundId, dto }); }}
                onDelete={async (backgroundId) => { await deleteBackgroundMutation.mutateAsync(backgroundId); }}
              />
            </div>

            {/* SPECIAL REQUIREMENTS SECTION */}
            <SectionHeader icon={<ThunderboltOutlined />} title="Special Requirements" theme={theme} count={callSheet.specialRequirements?.length || 0} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <SpecialRequirementsSection
                requirements={callSheet.specialRequirements || []}
                callSheetId={id!}
                onAdd={async (dto) => { await addSpecialReqMutation.mutateAsync(dto); }}
                onUpdate={async (reqId, dto) => { await updateSpecialReqMutation.mutateAsync({ reqId, dto }); }}
                onDelete={async (reqId) => { await deleteSpecialReqMutation.mutateAsync(reqId); }}
              />
            </div>
          </>
        )}

        {/* PHOTO-SPECIFIC SECTIONS */}
        {callSheet.callSheetType === 'PHOTO' && (
          <>
            {/* SHOT LIST SECTION */}
            <SectionHeader icon={<VideoCameraOutlined />} title="Shot List / Looks" theme={theme} count={callSheet.shots?.length} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <ShotListSection
                callSheetId={id!}
                shots={callSheet.shots}
                theme={theme}
                onDataChange={() => queryClient.invalidateQueries({ queryKey: ['callSheet', id] })}
              />
            </div>

            {/* MODELS SECTION */}
            <SectionHeader icon={<TeamOutlined />} title="Models / Talent" theme={theme} count={callSheet.models?.length} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <ModelsSection
                callSheetId={id!}
                models={callSheet.models}
                theme={theme}
                onDataChange={() => queryClient.invalidateQueries({ queryKey: ['callSheet', id] })}
              />
            </div>

            {/* WARDROBE SECTION */}
            <SectionHeader icon={<EditOutlined />} title="Wardrobe Tracking" theme={theme} count={callSheet.wardrobe?.length} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <WardrobeSection
                callSheetId={id!}
                wardrobe={callSheet.wardrobe}
                theme={theme}
                onDataChange={() => queryClient.invalidateQueries({ queryKey: ['callSheet', id] })}
              />
            </div>

            {/* HMU SCHEDULE SECTION */}
            <SectionHeader icon={<TeamOutlined />} title="H&MU Schedule" theme={theme} count={callSheet.hmuSchedule?.length} />
            <div style={{ background: theme.colors.background.primary, padding: 16, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              <HMUScheduleSection
                callSheetId={id!}
                hmuSchedule={callSheet.hmuSchedule}
                theme={theme}
                onDataChange={() => queryClient.invalidateQueries({ queryKey: ['callSheet', id] })}
              />
            </div>
          </>
        )}

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

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        title="Call Sheet PDF"
        fetchPreview={(continuous) => callSheetsApi.previewPDF(id!, continuous)}
        fetchDownload={(continuous) => callSheetsApi.generatePDF(id!, continuous)}
        downloadFilename={`call-sheet-${callSheet.callSheetNumber || id}.pdf`}
      />

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

      {/* Add Scene Modal */}
      <Modal
        title="Add Scene"
        open={addSceneModalOpen}
        onCancel={() => {
          setAddSceneModalOpen(false);
          sceneForm.resetFields();
        }}
        footer={null}
      >
        <Form form={sceneForm} layout="vertical" onFinish={handleAddScene}>
          <Form.Item name="sceneNumber" label="Scene Number" rules={[{ required: true }]}>
            <Input placeholder="e.g., 1, 1A, 2" />
          </Form.Item>
          <Form.Item name="sceneName" label="Scene Name">
            <Input placeholder="Optional scene name or title" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="intExt" label="Int/Ext">
              <Select
                placeholder="Select"
                options={[
                  { label: 'INT', value: 'INT' },
                  { label: 'EXT', value: 'EXT' },
                ]}
              />
            </Form.Item>
            <Form.Item name="dayNight" label="Day/Night">
              <Select
                placeholder="Select"
                options={[
                  { label: 'DAY', value: 'DAY' },
                  { label: 'NIGHT', value: 'NIGHT' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="location" label="Location">
            <Input placeholder="Scene location" />
          </Form.Item>
          <Form.Item name="pageCount" label="Page Count">
            <Input type="number" placeholder="e.g., 2.5" step="0.25" />
          </Form.Item>
          <Form.Item name="castIds" label="Cast Numbers">
            <Input placeholder="Comma-separated cast numbers (e.g., 1,2,5)" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Scene description" rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAddSceneModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={addSceneMutation.isPending}>
                Add Scene
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Hospital Selection Modal */}
      <Modal
        title="Select Hospital"
        open={hospitalSearchModalOpen}
        onCancel={() => setHospitalSearchModalOpen(false)}
        footer={null}
        width={600}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {hospitalOptions.map((hospital) => (
            <div
              key={hospital.id}
              style={{
                padding: 12,
                marginBottom: 8,
                border: `1px solid ${theme.colors.border.default}`,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.colors.background.tertiary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              onClick={() => handleSelectHospital(hospital)}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{hospital.name}</div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 2 }}>
                📍 {hospital.address}
              </div>
              <div style={{ fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 }}>
                📞 {hospital.phone}
              </div>
              <div style={{ fontSize: 11, color: theme.colors.accent.primary }}>
                {hospital.distance.toFixed(1)} km away
              </div>
            </div>
          ))}
        </div>
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
        background: '#1e293b',
        borderLeft: `4px solid ${theme.colors.accent.primary}`,
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
