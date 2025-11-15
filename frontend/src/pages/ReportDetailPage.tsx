import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Modal,
  Form,
  Spin,
  Typography,
  Tag,
  Divider,
  Empty,
  Popconfirm,
  Collapse,
  theme,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
  FilePdfOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ChartRenderer from '../components/reports/ChartRenderer';
import VisualChartEditor from '../components/reports/VisualChartEditor';
import { useIsMobile } from '../hooks/useMediaQuery';

// Context import
import { ReportProvider, useReportContext } from '../features/reports/contexts/ReportContext';
import { AddSectionModal } from '../features/reports/components/ReportSections/AddSectionModal';
import { ReportUtils } from '../features/reports/services/reportUtils';
import type { ReportSection } from '../features/reports/types/report.types';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

const ReportDetailContent: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useToken();
  const isMobile = useIsMobile();

  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [editVisualizationModalOpen, setEditVisualizationModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ReportSection | null>(null);

  const [vizForm] = Form.useForm();

  // Use context instead of individual hooks
  const {
    report,
    isLoading,
    addSection,
    removeSection,
    reorderSections,
    updateVisualizations,
    updateStatus,
    generatePDF,
    isAddingSection,
    isGeneratingPDF,
  } = useReportContext();

  // Handle add section
  const handleAddSection = async (file: File, data: any, selectedColumns: string[]) => {
    await addSection(file, data, selectedColumns);
    setAddSectionModalOpen(false);
  };

  // Handle remove section
  const handleRemoveSection = async (sectionId: string) => {
    await removeSection(sectionId);
  };

  // Handle reorder section
  const handleReorderSection = async (sectionId: string, direction: 'up' | 'down') => {
    if (!report?.sections) return;

    const sections = [...report.sections];
    const currentIndex = sections.findIndex((s) => s.id === sectionId);

    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sections.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [sections[currentIndex], sections[newIndex]] = [sections[newIndex], sections[currentIndex]];

    await reorderSections(sections.map((s) => s.id));
  };

  // Handle edit visualizations
  const handleEditVisualizations = (section: ReportSection) => {
    setSelectedSection(section);
    vizForm.setFieldsValue({
      visualizations: section.visualizations || [],
    });
    setEditVisualizationModalOpen(true);
  };

  // Handle save visualizations
  const handleSaveVisualizations = async (values: any) => {
    if (!selectedSection) return;

    await updateVisualizations(selectedSection.id, {
      visualizations: values.visualizations || [],
    });

    setEditVisualizationModalOpen(false);
    vizForm.resetFields();
  };

  if (isLoading && !report) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <Empty description="Report not found" />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Button onClick={() => navigate('/social-media-reports')}>Back to Reports</Button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <FileTextOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />
                <Title level={2} style={{ margin: 0 }}>
                  {report.title}
                </Title>
                <Tag color={ReportUtils.getStatusColor(report.status)}>{report.status}</Tag>
              </Space>

              {report.description && <Paragraph type="secondary">{report.description}</Paragraph>}

              <Space wrap>
                <Text strong>Project:</Text>
                <Text>{report.project?.description || 'N/A'}</Text>
                <Divider type="vertical" />
                <Text strong>Client:</Text>
                <Text>{report.project?.client?.name || 'N/A'}</Text>
                <Divider type="vertical" />
                <Text strong>Period:</Text>
                <Text>{ReportUtils.formatPeriod(report.month, report.year)}</Text>
              </Space>
            </Space>
          </div>

          <Space direction="vertical" align="end">
            <Space wrap size={isMobile ? 'small' : 'middle'}>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setAddSectionModalOpen(true)}
                title="Add Section"
              >
                {!isMobile && 'Add Section'}
              </Button>

              {report.status === 'DRAFT' && (
                <Button
                  icon={<CheckCircleOutlined />}
                  onClick={() => updateStatus('COMPLETED')}
                  title="Mark Complete"
                >
                  {!isMobile && 'Mark Complete'}
                </Button>
              )}

              {report.status === 'COMPLETED' && (
                <Button
                  icon={<SendOutlined />}
                  onClick={() => updateStatus('SENT')}
                  title="Mark as Sent"
                >
                  {!isMobile && 'Mark as Sent'}
                </Button>
              )}

              {ReportUtils.canGeneratePDF(report.sections?.length || 0) && (
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={() => generatePDF()}
                  loading={isGeneratingPDF}
                  type="default"
                  style={{
                    background: token.colorSuccess,
                    color: token.colorTextLightSolid,
                    borderColor: token.colorSuccess,
                  }}
                  title="Generate PDF"
                >
                  {!isMobile && 'Generate PDF'}
                </Button>
              )}

              {report.pdfUrl && (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => window.open(report.pdfUrl, '_blank')}
                  title="Download PDF"
                >
                  {!isMobile && 'Download PDF'}
                </Button>
              )}
            </Space>

            <Button
              onClick={() => navigate('/social-media-reports')}
              title="Back to Reports"
            >
              {!isMobile ? 'Back to Reports' : 'Back'}
            </Button>
          </Space>
        </div>
      </Card>

      {/* Sections */}
      <Card
        title={`Sections (${report.sections?.length || 0})`}
        extra={
          report.sections && report.sections.length > 0 && (
            <Button
              type="primary"
              icon={<AppstoreOutlined />}
              onClick={() => navigate(`/social-media-reports/${report.id}/builder`)}
            >
              Visual Builder (All Sections)
            </Button>
          )
        }
      >
        {!report.sections || report.sections.length === 0 ? (
          <Empty description="No sections yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddSectionModalOpen(true)}
            >
              Add Your First Section
            </Button>
          </Empty>
        ) : (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {report.sections.map((section, index) => (
              <Card
                key={section.id}
                type="inner"
                title={
                  <Space>
                    <Text strong>
                      {section.order}. {section.title}
                    </Text>
                    <Tag>{section.rowCount} rows</Tag>
                  </Space>
                }
                extra={
                  <Space wrap={isMobile} size={isMobile ? 'small' : 'middle'}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => handleReorderSection(section.id, 'up')}
                      title="Move Up"
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === (report.sections?.length || 0) - 1}
                      onClick={() => handleReorderSection(section.id, 'down')}
                      title="Move Down"
                    />
                    <Button
                      size="small"
                      icon={<AppstoreOutlined />}
                      onClick={() =>
                        navigate(`/social-media-reports/${report.id}/sections/${section.id}/builder`)
                      }
                      title="Section Visual Builder"
                    >
                      {!isMobile && 'Section Only'}
                    </Button>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditVisualizations(section)}
                      title="Edit Charts"
                    >
                      {!isMobile && 'Edit Charts'}
                    </Button>
                    <Popconfirm
                      title="Remove this section?"
                      onConfirm={() => handleRemoveSection(section.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} title="Remove Section">
                        {!isMobile && 'Remove'}
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {section.description && <Paragraph type="secondary">{section.description}</Paragraph>}

                  <div>
                    <Text strong>CSV File: </Text>
                    <Text code>{section.csvFileName}</Text>
                  </div>

                  <div>
                    <Text strong>Columns: </Text>
                    <Space wrap>
                      {Object.entries(section.columnTypes).map(([col, type]) => (
                        <Tag
                          key={col}
                          color={type === 'NUMBER' ? 'blue' : type === 'DATE' ? 'green' : 'default'}
                        >
                          {col} ({type})
                        </Tag>
                      ))}
                    </Space>
                  </div>

                  <div>
                    <Text strong>Visualizations: </Text>
                    <Text>{section.visualizations?.length || 0} charts configured</Text>
                  </div>

                  <div>
                    <Text type="secondary">
                      Imported: {new Date(section.importedAt).toLocaleString('id-ID')}
                    </Text>
                  </div>

                  {section.visualizations && section.visualizations.length > 0 && (
                    <Collapse
                      size="small"
                      items={[
                        {
                          key: 'charts',
                          label: (
                            <Space>
                              <EyeOutlined />
                              <Text strong>Preview Charts ({section.visualizations.length})</Text>
                            </Space>
                          ),
                          children: (
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                              {section.visualizations.map((viz, vizIndex) => (
                                <ChartRenderer
                                  key={vizIndex}
                                  config={viz}
                                  data={section.rawData || []}
                                />
                              ))}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Card>

      {/* Add Section Modal */}
      <AddSectionModal
        open={addSectionModalOpen}
        onClose={() => setAddSectionModalOpen(false)}
        onSubmit={handleAddSection}
        loading={isAddingSection}
      />

      {/* Edit Visualizations Modal */}
      <Modal
        title={`Edit Charts - ${selectedSection?.title}`}
        open={editVisualizationModalOpen}
        onCancel={() => {
          setEditVisualizationModalOpen(false);
          vizForm.resetFields();
        }}
        onOk={() => vizForm.submit()}
        width={900}
        confirmLoading={false}
        okText="Save Charts"
      >
        <Form form={vizForm} layout="vertical" onFinish={handleSaveVisualizations}>
          <Form.Item
            name="visualizations"
            label="Chart Configuration"
            help="Add and configure charts to visualize your data. Each chart can display different metrics from your CSV data."
          >
            <VisualChartEditor columnTypes={selectedSection?.columnTypes || {}} />
          </Form.Item>

          <div
            style={{
              background: token.colorInfoBg,
              padding: token.paddingSM,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorInfoBorder}`,
            }}
          >
            <Text type="secondary">
              <strong>💡 Tip:</strong> Line/Bar/Area charts work best with date or category data on
              X-axis and numbers on Y-axis. Pie charts show proportions, and Metric Cards display single
              summary values.
            </Text>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export const ReportDetailPage: React.FC = () => {
  return (
    <ReportProvider>
      <ReportDetailContent />
    </ReportProvider>
  );
};

export default ReportDetailPage;
