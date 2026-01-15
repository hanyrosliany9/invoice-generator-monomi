import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  Progress,
  Typography,
  Tag,
  Popconfirm,
  Row,
  Col,
  Checkbox,
  Spin,
  Empty,
  Image,
  Statistic,
  Alert,
  Segmented,
  App,
} from 'antd'
import {
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pinterestService, PinterestJob, PinterestPin } from '../../services/pinterestService'
import { useTheme } from '../../theme'
import debounce from 'lodash/debounce'

const { Title, Text, Paragraph } = Typography

interface DownloadFormValues {
  url: string
  downloadImages: boolean
  downloadVideos: boolean
}

interface PinInfo {
  pinId: string
  title?: string
  description?: string
  mediaType: 'image' | 'video'
  previewUrl?: string
  isPin: boolean
  urlType: string
}

export const PinterestDownloaderPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<DownloadFormValues>()
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [urlType, setUrlType] = useState<'unknown' | 'pin' | 'board' | 'user' | 'section'>('unknown')
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null)
  const [checkingUrl, setCheckingUrl] = useState(false)

  // Fetch jobs
  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['pinterest-jobs'],
    queryFn: () => pinterestService.getJobs(1, 20),
    refetchInterval: 5000, // Poll every 5 seconds for progress updates
  })

  // Fetch pins for selected job
  const { data: pinsData, isLoading: pinsLoading } = useQuery({
    queryKey: ['pinterest-pins', selectedJob],
    queryFn: () => (selectedJob ? pinterestService.getPins(selectedJob) : null),
    enabled: !!selectedJob,
  })

  // Start download mutation
  const startDownloadMutation = useMutation({
    mutationFn: (values: DownloadFormValues) =>
      pinterestService.startDownload(values.url, {
        downloadImages: values.downloadImages,
        downloadVideos: values.downloadVideos,
      }),
    onSuccess: () => {
      message.success('Download started!')
      form.resetFields()
      queryClient.invalidateQueries({ queryKey: ['pinterest-jobs'] })
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to start download')
    },
  })

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => pinterestService.cancelJob(jobId),
    onSuccess: () => {
      message.success('Job cancelled')
      queryClient.invalidateQueries({ queryKey: ['pinterest-jobs'] })
    },
    onError: () => {
      message.error('Failed to cancel job')
    },
  })

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => pinterestService.deleteJob(jobId),
    onSuccess: () => {
      message.success('Job deleted')
      if (selectedJob) setSelectedJob(null)
      queryClient.invalidateQueries({ queryKey: ['pinterest-jobs'] })
    },
    onError: () => {
      message.error('Failed to delete job')
    },
  })

  // Quick download mutation (for single pins)
  const quickDownloadMutation = useMutation({
    mutationFn: (url: string) => pinterestService.quickDownload(url),
    onSuccess: () => {
      message.success('Download started! Check your Downloads folder.')
      form.resetFields()
      setPinInfo(null)
      setUrlType('unknown')
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to download pin')
    },
  })

  // Debounced URL check
  const checkUrl = useCallback(
    debounce(async (url: string) => {
      if (!url || url.length < 10) {
        setUrlType('unknown')
        setPinInfo(null)
        return
      }

      // Basic URL validation
      if (!url.includes('pinterest.com') && !url.includes('pin.it')) {
        setUrlType('unknown')
        setPinInfo(null)
        return
      }

      setCheckingUrl(true)
      try {
        const info = await pinterestService.getPinInfo(url)
        setPinInfo(info)
        setUrlType(info.urlType as any)
      } catch (error) {
        console.error('URL check failed:', error)
        setUrlType('unknown')
        setPinInfo(null)
      } finally {
        setCheckingUrl(false)
      }
    }, 500),
    []
  )

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    checkUrl(url)
  }

  const handleSubmit = (values: DownloadFormValues) => {
    if (urlType === 'pin' && pinInfo) {
      // For single pins, use quick download (goes to Downloads folder)
      quickDownloadMutation.mutate(values.url)
    } else {
      // For boards/users, use batch download
      startDownloadMutation.mutate(values)
    }
  }

  const handleQuickDownload = () => {
    const url = form.getFieldValue('url')
    if (url) {
      quickDownloadMutation.mutate(url)
    }
  }

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      pending: { color: 'default', icon: <ClockCircleOutlined /> },
      running: { color: 'processing', icon: <Spin size="small" /> },
      completed: { color: 'success', icon: <CheckCircleOutlined /> },
      failed: { color: 'error', icon: <CloseCircleOutlined /> },
    }
    const config = statusConfig[status] || statusConfig.pending
    return (
      <Tag color={config.color} icon={config.icon}>
        {status.toUpperCase()}
      </Tag>
    )
  }

  const columns = [
    {
      title: 'Board/User',
      key: 'name',
      render: (record: PinterestJob) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.boardName || record.username || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.type}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 200,
      render: (record: PinterestJob) => {
        const total = record.totalPins || 0
        const done = record.downloadedPins + record.failedPins + record.skippedPins
        const percent = total > 0 ? Math.round((done / total) * 100) : 0
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Progress
              percent={percent}
              size="small"
              status={record.status === 'failed' ? 'exception' : undefined}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.downloadedPins} / {total} pins
            </Text>
          </Space>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PinterestJob) => (
        <Space>
          {record.status === 'completed' && record.downloadedPins > 0 && (
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                // Trigger download via hidden link
                const link = document.createElement('a')
                link.href = pinterestService.getJobDownloadUrl(record.id)
                link.download = ''
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              Download ZIP
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => setSelectedJob(record.id)}
          >
            View Pins
          </Button>
          {record.status === 'running' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => cancelJobMutation.mutate(record.id)}
            >
              Cancel
            </Button>
          )}
          <Popconfirm
            title="Delete this download?"
            description="This will also delete all downloaded files."
            onConfirm={() => deleteJobMutation.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const jobs = jobsData?.data || []
  const pins = pinsData?.data || []
  const selectedJobData = jobs.find((j) => j.id === selectedJob)

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <PictureOutlined style={{ marginRight: 12 }} />
        Pinterest Downloader
      </Title>
      <Paragraph type="secondary">
        Download images and videos from Pinterest boards, user profiles, or single pins.
      </Paragraph>

      {/* Download Form */}
      <Card
        title="New Download"
        style={{ marginBottom: 24 }}
        styles={{ body: { paddingBottom: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ downloadImages: true, downloadVideos: true }}
        >
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="url"
                label={
                  <Space>
                    <span>Pinterest URL</span>
                    {checkingUrl && <Spin size="small" />}
                    {urlType !== 'unknown' && !checkingUrl && (
                      <Tag color={urlType === 'pin' ? 'green' : 'blue'}>
                        {urlType === 'pin' ? (
                          <>
                            {pinInfo?.mediaType === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                            {' Single ' + (pinInfo?.mediaType || 'pin')}
                          </>
                        ) : (
                          <>{urlType.charAt(0).toUpperCase() + urlType.slice(1)} (batch)</>
                        )}
                      </Tag>
                    )}
                  </Space>
                }
                rules={[
                  { required: true, message: 'Please enter a Pinterest URL' },
                  { type: 'url', message: 'Please enter a valid URL' },
                ]}
              >
                <Input
                  placeholder="https://pinterest.com/pin/123... or https://pinterest.com/username/board"
                  size="large"
                  onChange={handleUrlChange}
                  suffix={
                    <span style={{ visibility: urlType === 'pin' ? 'visible' : 'hidden', width: 16 }}>
                      {pinInfo?.mediaType === 'video' ? (
                        <VideoCameraOutlined style={{ color: '#1890ff' }} />
                      ) : (
                        <PictureOutlined style={{ color: '#52c41a' }} />
                      )}
                    </span>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              {urlType !== 'pin' && (
                <Form.Item label="Options" style={{ marginBottom: 0 }}>
                  <Space>
                    <Form.Item name="downloadImages" valuePropName="checked" noStyle>
                      <Checkbox>
                        <PictureOutlined /> Images
                      </Checkbox>
                    </Form.Item>
                    <Form.Item name="downloadVideos" valuePropName="checked" noStyle>
                      <Checkbox>
                        <VideoCameraOutlined /> Videos
                      </Checkbox>
                    </Form.Item>
                  </Space>
                </Form.Item>
              )}
              {urlType === 'pin' && pinInfo && (
                <div style={{ paddingTop: 30 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {pinInfo.mediaType === 'video' ? 'Video' : 'Image'} will download to your Downloads folder
                  </Text>
                </div>
              )}
            </Col>
          </Row>

          {/* Single Pin Preview */}
          {urlType === 'pin' && pinInfo && pinInfo.previewUrl && (
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16} align="middle">
                <Col>
                  <Image
                    src={pinInfo.previewUrl}
                    alt="Pin preview"
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgesANTYA3F9BZmkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABNJREFUeNpiwAuYqD+CGaMSAwAvfAB1oF6EbwAAAABJRU5ErkJggg=="
                  />
                </Col>
                <Col flex="auto">
                  <Space direction="vertical" size={0}>
                    {pinInfo.title && <Text strong>{pinInfo.title}</Text>}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Pin ID: {pinInfo.pinId}
                    </Text>
                    <Tag color={pinInfo.mediaType === 'video' ? 'blue' : 'green'} style={{ marginTop: 4 }}>
                      {pinInfo.mediaType === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                      {' '}{pinInfo.mediaType.toUpperCase()}
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </div>
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              {urlType === 'pin' ? (
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  loading={quickDownloadMutation.isPending}
                  onClick={handleQuickDownload}
                  size="large"
                >
                  Quick Download to Downloads
                </Button>
              ) : (
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<CloudDownloadOutlined />}
                  loading={startDownloadMutation.isPending}
                  size="large"
                >
                  Start Batch Download
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Row gutter={24}>
        {/* Download History */}
        <Col xs={24} lg={selectedJob ? 12 : 24}>
          <Card
            title="Download History"
            extra={
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => refetchJobs()}
              >
                Refresh
              </Button>
            }
          >
            <Table
              dataSource={jobs}
              columns={columns}
              rowKey="id"
              loading={jobsLoading}
              pagination={{ pageSize: 10 }}
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No downloads yet"
                  />
                ),
              }}
              onRow={(record) => ({
                onClick: () => setSelectedJob(record.id),
                style: {
                  cursor: 'pointer',
                  background: selectedJob === record.id ? theme.colors.background.tertiary : undefined,
                },
              })}
            />
          </Card>
        </Col>

        {/* Pin Gallery */}
        {selectedJob && (
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <span>Downloaded Pins</span>
                  {selectedJobData && (
                    <Tag color="blue">{selectedJobData.boardName || selectedJobData.username}</Tag>
                  )}
                </Space>
              }
              extra={
                <Button type="text" onClick={() => setSelectedJob(null)}>
                  Close
                </Button>
              }
            >
              {selectedJobData && (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Statistic
                        title="Total"
                        value={selectedJobData.totalPins}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Downloaded"
                        value={selectedJobData.downloadedPins}
                        valueStyle={{ fontSize: 16, color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Failed"
                        value={selectedJobData.failedPins}
                        valueStyle={{ fontSize: 16, color: '#ff4d4f' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="Skipped"
                        value={selectedJobData.skippedPins}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                  </Row>
                  {selectedJobData.outputPath && (
                    <div style={{ marginBottom: 16, padding: '8px 12px', background: theme.colors.background.tertiary, borderRadius: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <FolderOpenOutlined style={{ marginRight: 8 }} />
                        Saved to: <code style={{ fontSize: 11 }}>{selectedJobData.outputPath}</code>
                      </Text>
                    </div>
                  )}
                  {selectedJobData.status === 'completed' && selectedJobData.downloadedPins > 0 && (
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      style={{ marginBottom: 16 }}
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = pinterestService.getJobDownloadUrl(selectedJobData.id)
                        link.download = ''
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                      }}
                    >
                      Download All as ZIP
                    </Button>
                  )}
                </>
              )}

              {pinsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin />
                </div>
              ) : pins.length === 0 ? (
                <Empty description="No pins downloaded yet" />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 8,
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}
                >
                  <Image.PreviewGroup>
                    {pins.map((pin) => (
                      <div
                        key={pin.id}
                        style={{
                          aspectRatio: '1',
                          background: theme.colors.card.background,
                          borderRadius: 4,
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        {pin.downloaded && pin.localPath ? (
                          <Image
                            src={`/api/v1/pinterest/pins/${pin.id}/file`}
                            alt={pin.title || pin.pinId}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgesANTYA3F9BZmkAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABNJREFUeNpiwAuYqD+CGaMSAwAvfAB1oF6EbwAAAABJRU5ErkJggg=="
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#f0f0f0',
                            }}
                          >
                            {pin.error ? (
                              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                            ) : (
                              <Spin size="small" />
                            )}
                          </div>
                        )}
                        {pin.mediaType === 'video' && (
                          <VideoCameraOutlined
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              color: '#fff',
                              textShadow: '0 0 2px rgba(0,0,0,0.5)',
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </Image.PreviewGroup>
                </div>
              )}
            </Card>
          </Col>
        )}
      </Row>
    </div>
  )
}

export default PinterestDownloaderPage
