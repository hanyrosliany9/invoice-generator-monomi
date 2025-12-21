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
  Row,
  Col,
} from 'antd';
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
    mutationFn: (dto: Partial<typeof callSheet>) =>
      callSheetsApi.update(id!, dto as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      message.success('Saved');
    },
    onError: () => {
      message.error('Failed to save');
    },
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!callSheet) {
    return <Empty description="Call sheet not found" />;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Space size="large">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Call Sheet #{callSheet.callSheetNumber}
            </Title>
            <Text type="secondary">
              {dayjs(callSheet.shootDate).format('dddd, MMMM D, YYYY')}
            </Text>
          </div>
        </Space>
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/call-sheets/${id}/view`)}
          >
            Preview
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={() =>
              window.open(`/api/call-sheets/${id}/export/pdf`, '_blank')
            }
          >
            Export PDF
          </Button>
          <Button icon={<SendOutlined />} type="primary">
            Send Call Sheet
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: 24 }}>
        <Row gutter={[24, 24]}>
          {/* Left Column - Main Content */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <CallSheetHeader
                callSheet={callSheet}
                onUpdate={(dto) => updateMutation.mutate(dto)}
              />
              <SceneScheduleTable
                callSheetId={id!}
                scenes={callSheet.scenes}
              />
              <CastCallTable
                callSheetId={id!}
                castCalls={callSheet.castCalls}
              />
              <CrewCallTable
                callSheetId={id!}
                crewCalls={callSheet.crewCalls}
              />
            </Space>
          </Col>

          {/* Right Column - Info Cards */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <LocationCard
                callSheet={callSheet}
                onUpdate={(dto) => updateMutation.mutate(dto)}
              />
              <WeatherCard
                callSheet={callSheet}
                onUpdate={(dto) => updateMutation.mutate(dto)}
              />
              <NotesSection
                callSheet={callSheet}
                onUpdate={(dto) => updateMutation.mutate(dto)}
              />
            </Space>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
