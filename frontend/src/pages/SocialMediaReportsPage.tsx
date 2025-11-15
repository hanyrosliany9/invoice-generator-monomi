import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useProjects } from '../hooks/useProjects';
import MobileTableView from '../components/mobile/MobileTableView';
import { BusinessEntity } from '../components/tables/SmartTable';
import type { MobileTableAction } from '../components/mobile/MobileTableView';

// New imports from refactored structure
import { useReports, useReportMutations } from '../features/reports/hooks';
import { CreateReportModal } from '../features/reports/components/ReportsList/CreateReportModal';
import { ReportUtils } from '../features/reports/services/reportUtils';
import type { SocialMediaReport, CreateReportDto } from '../features/reports/types/report.types';

export const SocialMediaReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Use new hooks instead of manual state management
  const { data: reports = [], isLoading } = useReports();
  const { data: projects = [] } = useProjects();
  const { createReport, deleteReport } = useReportMutations();

  // Handle create report
  const handleCreateReport = async (values: CreateReportDto) => {
    const newReport = await createReport.mutateAsync(values);
    setCreateModalOpen(false);
    navigate(`/social-media-reports/${newReport.id}`);
  };

  // Handle delete report
  const handleDelete = async (id: string) => {
    await deleteReport.mutateAsync(id);
  };

  // Mobile data adapter
  const mobileData: BusinessEntity[] = reports.map((report) => ({
    id: report.id,
    number: `${report.month}/${report.year}`,
    title: report.title,
    subtitle: report.project?.description || 'No project',
    description: `${ReportUtils.formatPeriod(report.month, report.year)} • ${
      report.sections?.length || 0
    } sections`,
    status: report.status as any,
    statusColor: ReportUtils.getStatusColor(report.status),
    metadata: [
      { label: 'Client', value: report.project?.client?.name || '-' },
      { label: 'Period', value: `${report.month}/${report.year}` },
      { label: 'Sections', value: String(report.sections?.length || 0) },
    ],
    rawData: report,
  }));

  // Mobile actions
  const mobileActions: MobileTableAction[] = [
    {
      key: 'edit',
      label: 'Edit Report',
      icon: <EditOutlined />,
      primary: true,
      onClick: (item) => navigate(`/social-media-reports/${item.id}`),
    },
    {
      key: 'pdf',
      label: 'Download PDF',
      icon: <DownloadOutlined />,
      onClick: (item) => {
        const report = item.rawData as SocialMediaReport;
        if (report.pdfUrl) {
          window.open(report.pdfUrl, '_blank');
        }
      },
      visible: (item) => !!(item.rawData as SocialMediaReport).pdfUrl,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (item) => handleDelete(item.id),
    },
  ];

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: SocialMediaReport) => (
        <Button
          type="link"
          onClick={() => navigate(`/social-media-reports/${record.id}`)}
          icon={<FileTextOutlined />}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Project',
      dataIndex: ['project', 'description'],
      key: 'project',
    },
    {
      title: 'Client',
      dataIndex: ['project', 'client', 'name'],
      key: 'client',
    },
    {
      title: 'Period',
      key: 'period',
      render: (_: any, record: SocialMediaReport) => (
        <span>{ReportUtils.formatPeriod(record.month, record.year)}</span>
      ),
    },
    {
      title: 'Sections',
      dataIndex: 'sections',
      key: 'sections',
      render: (sections: any[]) => sections?.length || 0,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => (
        <Tag color={ReportUtils.getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SocialMediaReport) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/social-media-reports/${record.id}`)}
          >
            Edit
          </Button>
          {record.pdfUrl && (
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => window.open(record.pdfUrl, '_blank')}
            >
              PDF
            </Button>
          )}
          <Popconfirm
            title="Delete this report?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }}>
      <Card
        title="Universal Social Media Reports"
        extra={
          !isMobile && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Report
            </Button>
          )
        }
      >
        {isMobile ? (
          <>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalOpen(true)}
              block
              style={{ marginBottom: '16px' }}
            >
              Create Report
            </Button>
            <MobileTableView
              data={mobileData}
              loading={isLoading}
              entityType="reports"
              onItemSelect={(item: BusinessEntity) =>
                navigate(`/social-media-reports/${item.id}`)
              }
              actions={mobileActions}
            />
          </>
        ) : (
          <Table
            columns={columns}
            dataSource={reports}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      <CreateReportModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateReport}
        projects={projects}
        loading={createReport.isPending}
      />
    </div>
  );
};

export default SocialMediaReportsPage;
