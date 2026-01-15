import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Select,
  Spin,
  Alert,
  Descriptions,
  Image,
  App,
  Divider,
  Switch,
  Table,
  Progress,
  Popconfirm,
  Checkbox,
  Statistic,
  Empty,
  Tabs,
} from 'antd'
import {
  DownloadOutlined,
  YoutubeOutlined,
  InstagramOutlined,
  TwitterOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
  LinkOutlined,
  PictureOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined,
  CloudDownloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  mediaDownloaderService,
  MediaInfo,
  VideoQuality,
  PlatformDetection,
} from '../../services/mediaDownloaderService'
import {
  pinterestService,
  PinterestJob,
  PinterestPin,
} from '../../services/pinterestService'
import { useTheme } from '../../theme'
import debounce from 'lodash/debounce'
import type { ColumnsType } from 'antd/es/table'

const { Title, Text, Paragraph } = Typography

interface DownloadFormValues {
  url: string
  quality: VideoQuality
  audioOnly: boolean
  downloadImages: boolean
  downloadVideos: boolean
}

const platformIcons: Record<string, React.ReactNode> = {
  youtube: <YoutubeOutlined style={{ color: '#FF0000' }} />,
  instagram: <InstagramOutlined style={{ color: '#E4405F' }} />,
  twitter: <TwitterOutlined style={{ color: '#1DA1F2' }} />,
  tiktok: <VideoCameraOutlined style={{ color: '#000000' }} />,
  facebook: <VideoCameraOutlined style={{ color: '#1877F2' }} />,
  vimeo: <VideoCameraOutlined style={{ color: '#1AB7EA' }} />,
  pinterest: <PictureOutlined style={{ color: '#E60023' }} />,
}

const platformColors: Record<string, string> = {
  youtube: 'red',
  instagram: 'magenta',
  twitter: 'blue',
  tiktok: 'default',
  facebook: 'geekblue',
  vimeo: 'cyan',
  pinterest: 'volcano',
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatViewCount = (count?: number): string => {
  if (!count) return '--'
  if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '--'
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

interface PinterestPinInfo {
  pinId: string
  title?: string
  description?: string
  mediaType: 'image' | 'video'
  previewUrl?: string
  isPin: boolean
  urlType: string
}

export const MediaDownloaderPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<DownloadFormValues>()
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null)
  const [pinterestInfo, setPinterestInfo] = useState<PinterestPinInfo | null>(null)
  const [platform, setPlatform] = useState<PlatformDetection | null>(null)
  const [checkingUrl, setCheckingUrl] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState<'download' | 'history'>('download')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  // Fetch supported platforms
  const { data: platforms } = useQuery({
    queryKey: ['media-platforms'],
    queryFn: mediaDownloaderService.getSupportedPlatforms,
  })

  // Fetch Pinterest jobs for history
  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ['pinterest-jobs'],
    queryFn: () => pinterestService.getJobs(1, 20),
    refetchInterval: 5000,
  })

  // Fetch pins for selected job
  const { data: pinsData, isLoading: pinsLoading } = useQuery({
    queryKey: ['pinterest-pins', selectedJob],
    queryFn: () => pinterestService.getPins(selectedJob!),
    enabled: !!selectedJob,
  })

  const jobs = jobsData?.data || []
  const pins = pinsData?.data || []
  const selectedJobData = jobs.find((j) => j.id === selectedJob)

  // Pinterest batch download mutation
  const startPinterestDownload = useMutation({
    mutationFn: (data: { url: string; downloadImages: boolean; downloadVideos: boolean }) =>
      pinterestService.startDownload(data.url, {
        downloadImages: data.downloadImages,
        downloadVideos: data.downloadVideos,
      }),
    onSuccess: () => {
      message.success('Pinterest download started!')
      form.resetFields()
      setPinterestInfo(null)
      setPlatform(null)
      queryClient.invalidateQueries({ queryKey: ['pinterest-jobs'] })
      setActiveTab('history')
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to start download')
    },
  })

  // Pinterest quick download mutation
  const pinterestQuickDownload = useMutation({
    mutationFn: (url: string) => pinterestService.quickDownload(url),
    onSuccess: () => {
      message.success('Download started! Check your Downloads folder.')
      form.resetFields()
      setPinterestInfo(null)
      setPlatform(null)
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Failed to download')
    },
  })

  // Delete Pinterest job
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

  // Debounced URL check
  const checkUrl = useCallback(
    debounce(async (url: string) => {
      if (!url || url.length < 10) {
        setMediaInfo(null)
        setPinterestInfo(null)
        setPlatform(null)
        return
      }

      setCheckingUrl(true)
      try {
        // First detect platform
        const detection = await mediaDownloaderService.detectPlatform(url)
        setPlatform(detection)

        if (detection.platform === 'pinterest') {
          // Use Pinterest service for info
          try {
            const info = await pinterestService.getPinInfo(url)
            setPinterestInfo(info)
            setMediaInfo(null)
          } catch {
            setPinterestInfo(null)
          }
        } else if (detection.isSupported) {
          // Use yt-dlp for other platforms
          try {
            const info = await mediaDownloaderService.getMediaInfo(url)
            setMediaInfo(info)
            setPinterestInfo(null)
          } catch {
            setMediaInfo(null)
          }
        } else {
          setMediaInfo(null)
          setPinterestInfo(null)
        }
      } catch (error: any) {
        console.error('URL check failed:', error)
        setMediaInfo(null)
        setPinterestInfo(null)
      } finally {
        setCheckingUrl(false)
      }
    }, 800),
    []
  )

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    checkUrl(e.target.value)
  }

  const handleDownload = async (values: DownloadFormValues) => {
    if (!values.url) {
      message.error('Please enter a URL')
      return
    }

    if (platform?.platform === 'pinterest') {
      // Handle Pinterest downloads
      if (pinterestInfo?.isPin) {
        // Single pin - quick download
        pinterestQuickDownload.mutate(values.url)
      } else {
        // Board/user - batch download
        startPinterestDownload.mutate({
          url: values.url,
          downloadImages: values.downloadImages,
          downloadVideos: values.downloadVideos,
        })
      }
    } else {
      // Handle other platforms via yt-dlp
      setDownloading(true)
      try {
        await mediaDownloaderService.quickDownload({
          url: values.url,
          quality: values.quality,
          audioOnly: values.audioOnly,
        })
        message.success('Download started! Check your Downloads folder.')
        form.resetFields()
        setMediaInfo(null)
        setPlatform(null)
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error.message || 'Download failed'
        message.error(errorMsg)
      } finally {
        setDownloading(false)
      }
    }
  }

  const qualityOptions = mediaInfo?.availableQualities?.map((q) => ({
    label: q.charAt(0).toUpperCase() + q.slice(1),
    value: q,
  })) || [
    { label: 'Best Quality', value: 'best' },
    { label: '1080p HD', value: '1080p' },
    { label: '720p HD', value: '720p' },
    { label: '480p', value: '480p' },
    { label: '360p', value: '360p' },
    { label: 'Audio Only (MP3)', value: 'audio' },
  ]

  const isPinterest = platform?.platform === 'pinterest'
  const isPinterestPin = isPinterest && pinterestInfo?.isPin
  const isPinterestBatch = isPinterest && !pinterestInfo?.isPin && pinterestInfo?.urlType

  const isLoading = downloading || startPinterestDownload.isPending || pinterestQuickDownload.isPending

  // Pinterest jobs table columns
  const jobColumns: ColumnsType<PinterestJob> = [
    {
      title: 'Board/User',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.boardName || record.username || 'Unknown'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.type}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 200,
      render: (_, record) => {
        const percent = record.totalPins > 0
          ? Math.round((record.downloadedPins / record.totalPins) * 100)
          : 0
        return (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <Progress
              percent={percent}
              size="small"
              status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.downloadedPins}/{record.totalPins} pins
            </Text>
          </Space>
        )
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
          pending: { color: 'default', icon: <ClockCircleOutlined /> },
          running: { color: 'processing', icon: <Spin size="small" /> },
          completed: { color: 'success', icon: <CheckCircleOutlined /> },
          failed: { color: 'error', icon: <CloseCircleOutlined /> },
        }
        const config = statusConfig[record.status] || statusConfig.pending
        return (
          <Tag color={config.color}>
            {config.icon} {record.status}
          </Tag>
        )
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Delete this job?"
          onConfirm={() => deleteJobMutation.mutate(record.id)}
          okText="Delete"
          cancelText="Cancel"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>
        <DownloadOutlined style={{ marginRight: 12 }} />
        Media Downloader
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Download videos and images from YouTube, Instagram, TikTok, Pinterest, Twitter, and more.
      </Paragraph>

      {/* Supported Platforms */}
      <Alert
        type="info"
        showIcon
        icon={<LinkOutlined />}
        message="Supported Platforms"
        description={
          <Space wrap>
            {['youtube', 'instagram', 'tiktok', 'twitter', 'pinterest', 'facebook', 'vimeo'].map(
              (p) => (
                <Tag key={p} color={platformColors[p] || 'default'}>
                  {platformIcons[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
                </Tag>
              )
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'download' | 'history')}
        items={[
          {
            key: 'download',
            label: (
              <span>
                <CloudDownloadOutlined /> Download
              </span>
            ),
            children: (
              <Row gutter={24}>
                {/* Download Form */}
                <Col xs={24} lg={mediaInfo || pinterestInfo ? 12 : 24}>
                  <Card title="Download Media">
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleDownload}
                      initialValues={{
                        quality: 'best',
                        audioOnly: false,
                        downloadImages: true,
                        downloadVideos: true,
                      }}
                    >
                      <Form.Item
                        name="url"
                        label={
                          <Space>
                            <span>URL</span>
                            {checkingUrl && <Spin size="small" />}
                            {platform && !checkingUrl && (
                              <Tag color={platformColors[platform.platform] || 'default'}>
                                {platformIcons[platform.platform]} {platform.platform}
                                {platform.contentType && ` (${platform.contentType})`}
                              </Tag>
                            )}
                          </Space>
                        }
                        rules={[
                          { required: true, message: 'Please enter a URL' },
                          { type: 'url', message: 'Please enter a valid URL' },
                        ]}
                      >
                        <Input
                          placeholder="Paste any video or image URL..."
                          size="large"
                          onChange={handleUrlChange}
                          suffix={
                            <span style={{ width: 16 }}>
                              {platform?.isSupported ? (
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              ) : platform ? (
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                              ) : null}
                            </span>
                          }
                        />
                      </Form.Item>

                      {/* YouTube/yt-dlp options */}
                      {platform && !isPinterest && platform.isSupported && (
                        <Row gutter={16}>
                          <Col xs={24} sm={12}>
                            <Form.Item name="quality" label="Quality">
                              <Select options={qualityOptions} size="large" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="audioOnly"
                              label="Audio Only (MP3)"
                              valuePropName="checked"
                            >
                              <Switch checkedChildren={<AudioOutlined />} />
                            </Form.Item>
                          </Col>
                        </Row>
                      )}

                      {/* Pinterest batch options */}
                      {isPinterestBatch && (
                        <Form.Item label="Download Options">
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

                      {/* Pinterest pin info */}
                      {isPinterestPin && pinterestInfo && (
                        <Alert
                          type="success"
                          icon={pinterestInfo.mediaType === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                          message={`Single ${pinterestInfo.mediaType} detected`}
                          description="This will download directly to your Downloads folder."
                          style={{ marginBottom: 16 }}
                        />
                      )}

                      {/* Pinterest batch info */}
                      {isPinterestBatch && (
                        <Alert
                          type="info"
                          icon={<FolderOpenOutlined />}
                          message={`Pinterest ${pinterestInfo?.urlType} detected`}
                          description="This will start a batch download. You can track progress in the History tab."
                          style={{ marginBottom: 16 }}
                        />
                      )}

                      {platform && !platform.isSupported && (
                        <Alert
                          type="warning"
                          message="Platform Not Supported"
                          description={`${platform.platform} is not currently supported.`}
                          style={{ marginBottom: 16 }}
                        />
                      )}

                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={isPinterestBatch ? <CloudDownloadOutlined /> : <DownloadOutlined />}
                          size="large"
                          loading={isLoading}
                          disabled={!platform?.isSupported}
                          block
                        >
                          {isLoading
                            ? 'Downloading...'
                            : isPinterestBatch
                            ? 'Start Batch Download'
                            : 'Download'}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </Col>

                {/* Media Preview */}
                {(mediaInfo || (isPinterestPin && pinterestInfo)) && (
                  <Col xs={24} lg={12}>
                    <Card
                      title={
                        <Space>
                          <span>Preview</span>
                          <Tag color={platformColors[platform?.platform || ''] || 'default'}>
                            {platformIcons[platform?.platform || '']} {platform?.platform}
                          </Tag>
                        </Space>
                      }
                    >
                      {mediaInfo && (
                        <>
                          {mediaInfo.thumbnail && (
                            <div style={{ marginBottom: 16, textAlign: 'center' }}>
                              <Image
                                src={mediaInfo.thumbnail}
                                alt={mediaInfo.title}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: 200,
                                  borderRadius: 8,
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          )}

                          <Title level={4} ellipsis={{ rows: 2 }}>
                            {mediaInfo.title}
                          </Title>

                          <Descriptions column={2} size="small" style={{ marginTop: 16 }}>
                            {mediaInfo.uploader && (
                              <Descriptions.Item label={<><UserOutlined /> Uploader</>}>
                                {mediaInfo.uploader}
                              </Descriptions.Item>
                            )}
                            {mediaInfo.duration && (
                              <Descriptions.Item label={<><ClockCircleOutlined /> Duration</>}>
                                {formatDuration(mediaInfo.duration)}
                              </Descriptions.Item>
                            )}
                            {mediaInfo.viewCount && (
                              <Descriptions.Item label={<><EyeOutlined /> Views</>}>
                                {formatViewCount(mediaInfo.viewCount)}
                              </Descriptions.Item>
                            )}
                            {mediaInfo.filesize && (
                              <Descriptions.Item label="Size">
                                {formatFileSize(mediaInfo.filesize)}
                              </Descriptions.Item>
                            )}
                          </Descriptions>
                        </>
                      )}

                      {isPinterestPin && pinterestInfo && (
                        <div style={{ textAlign: 'center' }}>
                          {pinterestInfo.previewUrl && (
                            <Image
                              src={pinterestInfo.previewUrl}
                              alt="Pin preview"
                              style={{
                                maxWidth: '100%',
                                maxHeight: 300,
                                borderRadius: 8,
                                objectFit: 'cover',
                              }}
                            />
                          )}
                          <div style={{ marginTop: 16 }}>
                            <Tag color={pinterestInfo.mediaType === 'video' ? 'blue' : 'green'}>
                              {pinterestInfo.mediaType === 'video' ? <VideoCameraOutlined /> : <PictureOutlined />}
                              {' '}{pinterestInfo.mediaType}
                            </Tag>
                          </div>
                        </div>
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            ),
          },
          {
            key: 'history',
            label: (
              <span>
                <HistoryOutlined /> History
                {jobs.filter((j) => j.status === 'running').length > 0 && (
                  <Tag color="processing" style={{ marginLeft: 8 }}>
                    {jobs.filter((j) => j.status === 'running').length} running
                  </Tag>
                )}
              </span>
            ),
            children: (
              <Row gutter={24}>
                {/* Jobs Table */}
                <Col xs={24} lg={selectedJob ? 12 : 24}>
                  <Card
                    title="Download History"
                    extra={
                      <Button
                        type="text"
                        icon={<ReloadOutlined />}
                        onClick={() => refetchJobs()}
                        loading={jobsLoading}
                      >
                        Refresh
                      </Button>
                    }
                  >
                    {jobs.length === 0 ? (
                      <Empty description="No downloads yet. Start by pasting a Pinterest board URL above!" />
                    ) : (
                      <Table
                        columns={jobColumns}
                        dataSource={jobs}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        loading={jobsLoading}
                        onRow={(record) => ({
                          onClick: () => setSelectedJob(record.id),
                          style: {
                            cursor: 'pointer',
                            background: selectedJob === record.id ? theme.colors.background.tertiary : undefined,
                          },
                        })}
                      />
                    )}
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
                                    src={pinterestService.getPinFileUrl(pin.id)}
                                    alt={pin.title || pin.pinId}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: theme.colors.text.tertiary,
                                    }}
                                  >
                                    {pin.error ? (
                                      <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                                    ) : (
                                      <Spin size="small" />
                                    )}
                                  </div>
                                )}
                                {pin.mediaType === 'video' && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: 4,
                                      right: 4,
                                      background: 'rgba(0,0,0,0.6)',
                                      borderRadius: 4,
                                      padding: '2px 6px',
                                    }}
                                  >
                                    <VideoCameraOutlined style={{ color: '#fff', fontSize: 12 }} />
                                  </div>
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
            ),
          },
        ]}
      />

      {/* Instagram Note */}
      <Alert
        type="warning"
        message="Note: Instagram Authentication"
        description="Instagram requires login for most content. If Instagram downloads fail, the content may be private or require authentication."
        style={{ marginTop: 24 }}
        showIcon
      />
    </div>
  )
}

export default MediaDownloaderPage
