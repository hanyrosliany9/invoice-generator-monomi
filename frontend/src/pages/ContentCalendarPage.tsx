import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  App,
  Card,
  Select,
  Row,
  Col,
  Modal,
  Form,
  Input,
  DatePicker,
  Upload,
  Image,
  Tooltip,
  Badge,
  Segmented,
  Divider,
  theme,
  Progress,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RocketOutlined,
  InboxOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  DownloadOutlined,
  CopyOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  SaveOutlined,
  StarOutlined,
  ProjectOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  SearchOutlined,
  HolderOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { ContentGridView } from '../components/content-calendar/ContentGridView';
import { KanbanBoardView } from '../components/content-calendar/KanbanBoardView';
import { CalendarView } from '../components/content-calendar/CalendarView';
import { ContentPreviewModal } from '../components/content-calendar/ContentPreviewModal';
import { getProxyUrl } from '../utils/mediaProxy';
import { generateVideoThumbnail, isVideoFile } from '../utils/videoThumbnail';
import { downloadSingleMedia, downloadMediaAsZip } from '../utils/zipDownload';
import { exportContentToPDF } from '../utils/pdfExport';
import { useFilterPresets } from '../hooks/useFilterPresets';
import { getMediaLimitForPlatforms, validateMediaForPlatforms, PLATFORM_MEDIA_LIMITS } from '../utils/platformLimits';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import contentCalendarService from '../services/content-calendar';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  ContentCalendarItem,
  CreateContentDto,
  UpdateContentDto,
  ContentCalendarFilters,
} from '../services/content-calendar';
import { projectService } from '../services/projects';
import { clientService } from '../services/clients';
import { useAuthStore } from '../store/auth';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

// Sortable Media Item Component
interface SortableMediaItemProps {
  media: any;
  index: number;
  onRemove: (index: number) => void;
  onDownload: (media: any) => void;
  token: any;
}

function SortableMediaItem({ media, index, onRemove, onDownload, token }: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `media-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="media-item-sortable"
    >
      <Card
        size="small"
        style={{
          position: 'relative',
          width: 150,
          border: `2px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Order Badge */}
        <Badge
          count={index + 1}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            backgroundColor: token.colorPrimary,
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        />

        {/* Media Preview */}
        <div style={{ position: 'relative', height: 150, overflow: 'hidden', background: token.colorBgContainer }}>
          {media.mimeType?.startsWith('image') ? (
            <img
              width="100%"
              height="150"
              src={media.previewUrl || media.url}
              style={{ objectFit: 'cover' }}
              alt={`Media ${index + 1}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
              }}
            />
          ) : media.thumbnailUrl ? (
            <div style={{ position: 'relative', height: '100%' }}>
              <img
                width="100%"
                height="150"
                src={getProxyUrl(media.thumbnailUrl)}
                style={{ objectFit: 'cover' }}
                alt={`Video ${index + 1}`}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VideoCameraOutlined style={{ fontSize: 24, color: 'white' }} />
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: token.colorBgLayout,
              }}
            >
              <VideoCameraOutlined style={{ fontSize: 48, color: token.colorTextSecondary }} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', gap: 4, background: token.colorBgContainer }}>
          <Button
            size="small"
            icon={<HolderOutlined />}
            {...listeners}
            style={{ cursor: 'grab', flex: 1 }}
            title="Drag to reorder"
          />
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onDownload(media)}
            title="Download"
          />
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => onRemove(index)}
            title="Remove"
          />
        </div>

        {/* Filename */}
        <div style={{ padding: '4px 8px', fontSize: '11px', color: token.colorTextSecondary, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {media.originalName || `Media ${index + 1}`}
        </div>
      </Card>
    </div>
  );
}

// Content status options
const CONTENT_STATUS = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
} as const;

// Platform options
const PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram', color: '#E1306C' },
  { value: 'TIKTOK', label: 'TikTok', color: '#000000' },
  { value: 'FACEBOOK', label: 'Facebook', color: '#1877F2' },
  { value: 'TWITTER', label: 'Twitter', color: '#1DA1F2' },
  { value: 'LINKEDIN', label: 'LinkedIn', color: '#0A66C2' },
  { value: 'YOUTUBE', label: 'YouTube', color: '#FF0000' },
];

interface ContentCalendarPageProps {
  lockedProjectId?: string;      // Forces project filter
  hideProjectFilter?: boolean;    // Hides project dropdown
  lockedClientId?: string;        // Optional: for client-level views
}

const ContentCalendarPage: React.FC<ContentCalendarPageProps> = ({
  lockedProjectId,
  hideProjectFilter = false,
  lockedClientId,
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const platforms = Form.useWatch('platforms', form);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { token } = theme.useToken();

  // Filter presets management
  const { presets, savePreset, deletePreset, applyPreset } = useFilterPresets(
    user?.id || 'anonymous'
  );

  // Auto-detect project context from URL or navigation state
  const initialProjectId = useMemo(() => {
    // If locked by parent component, use that
    if (lockedProjectId) {
      return lockedProjectId;
    }
    // From URL params: ?projectId=xxx
    if (searchParams.get('projectId')) {
      return searchParams.get('projectId') || undefined;
    }
    // From navigation state (clicked from ProjectDetailPage)
    if (location.state?.projectId) {
      return location.state.projectId;
    }
    return undefined;
  }, [searchParams, location.state, lockedProjectId]);

  const [statusFilter, setStatusFilter] = useState<typeof CONTENT_STATUS[keyof typeof CONTENT_STATUS] | undefined>();
  const [platformFilter, setPlatformFilter] = useState<string | undefined>();
  const [clientFilter, setClientFilter] = useState<string | undefined>(lockedClientId);
  const [projectFilter, setProjectFilter] = useState<string | undefined>(initialProjectId);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Disable changing filters if locked
  const canChangeProject = !lockedProjectId;
  const canChangeClient = !lockedClientId;
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentCalendarItem | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewingContent, setPreviewingContent] = useState<ContentCalendarItem | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingCount, setUploadingCount] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban' | 'calendar'>('list');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [formSelectedClientId, setFormSelectedClientId] = useState<string | undefined>();

  // Drag and drop sensors for media reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for media reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setUploadedMedia((items) => {
        const oldIndex = items.findIndex((_item: UploadFile, idx: number) => `media-${idx}` === active.id);
        const newIndex = items.findIndex((_item: UploadFile, idx: number) => `media-${idx}` === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update order field to match new positions
        return reordered.map((item: any, index: number) => ({
          ...item,
          order: index,
        }));
      });
    }
  };

  // Persist view mode to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('content-calendar-view-mode');
    if (saved && (saved === 'list' || saved === 'grid' || saved === 'kanban' || saved === 'calendar')) {
      setViewMode(saved as 'list' | 'grid' | 'kanban' | 'calendar');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('content-calendar-view-mode', viewMode);
  }, [viewMode]);

  // Fetch contents
  const filters: ContentCalendarFilters = useMemo(() => ({
    status: statusFilter,
    platform: platformFilter as any,
    clientId: clientFilter,
    projectId: projectFilter,
  }), [statusFilter, platformFilter, clientFilter, projectFilter]);

  const { data: contentsData, isLoading } = useQuery({
    queryKey: ['content-calendar', statusFilter, platformFilter, clientFilter, projectFilter],
    queryFn: () => contentCalendarService.getContents(filters),
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
  });

  // Simplified projects without circular references (only essential fields)
  const simplifiedProjects = useMemo(() => {
    if (!projects) return [];
    return projects.map((p) => ({
      id: p.id,
      number: p.number,
      description: p.description,
      clientId: p.clientId,
    }));
  }, [projects]);

  // Create a Map for O(1) lookup of clientId by projectId (avoids find() in onChange)
  const projectToClientMap = useMemo(() => {
    const map = new Map<string, string>();
    simplifiedProjects.forEach((p) => {
      if (p.clientId) {
        map.set(p.id, p.clientId);
      }
    });
    return map;
  }, [simplifiedProjects]);

  // Filtered projects based on selected client (memoized to prevent circular ref warnings)
  const filteredProjects = useMemo(() => {
    if (!formSelectedClientId) return simplifiedProjects;
    return simplifiedProjects.filter((project) => project.clientId === formSelectedClientId);
  }, [simplifiedProjects, formSelectedClientId]);

  // Handler functions defined outside JSX to avoid closure inspection warnings
  const handleProjectChange = useCallback((value: string | null) => {
    if (!value) return;

    const clientId = projectToClientMap.get(value);
    if (!clientId) return;

    // Use setFieldsValue instead of setFieldValue to avoid circular ref warning
    form.setFieldsValue({ clientId });
    setFormSelectedClientId(clientId);
  }, [projectToClientMap, form]);

  const handleClientChange = useCallback((value: string | null) => {
    setFormSelectedClientId(value || undefined);

    const currentProjectId = form.getFieldValue('projectId');
    if (!currentProjectId || !value) return;

    const projectClientId = projectToClientMap.get(currentProjectId);
    if (!projectClientId || projectClientId === value) return;

    // Use setFieldsValue instead of setFieldValue to avoid circular ref warning
    form.setFieldsValue({ projectId: undefined });
  }, [projectToClientMap, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentCalendarService.createContent(data),
    onSuccess: () => {
      message.success('Content created successfully');
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to create content');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContentDto }) =>
      contentCalendarService.updateContent(id, data),
    onSuccess: () => {
      message.success('Content updated successfully');
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Failed to update content');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.deleteContent(id),
    onSuccess: () => {
      message.success('Content deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
    onError: () => {
      message.error('Failed to delete content');
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.publishContent(id),
    onSuccess: () => {
      message.success('Content published successfully');
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
    onError: () => {
      message.error('Failed to publish content');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.archiveContent(id),
    onSuccess: () => {
      message.success('Content archived successfully');
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
    },
    onError: () => {
      message.error('Failed to archive content');
    },
  });

  // Status colors
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      DRAFT: 'default',
      SCHEDULED: 'blue',
      PUBLISHED: 'success',
      FAILED: 'error',
      ARCHIVED: 'warning',
    };
    return colors[status] || 'default';
  };

  // Status icons
  const getStatusIcon = (status: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      DRAFT: <FileImageOutlined />,
      SCHEDULED: <ClockCircleOutlined />,
      PUBLISHED: <CheckCircleOutlined />,
      FAILED: <StopOutlined />,
      ARCHIVED: <InboxOutlined />,
    };
    return icons[status] || null;
  };

  // Handle modal open
  const handleOpenModal = (content?: ContentCalendarItem) => {
    if (content) {
      setEditingContent(content);
      // Fix: Map ContentMedia to the correct structure for uploadedMedia state
      const mappedMedia = (content.media || []).map((m) => ({
        url: m.url,
        key: m.key,
        mimeType: m.mimeType,
        size: m.size,
        width: m.width,
        height: m.height,
        duration: m.duration,
        originalName: m.originalName,
      }));
      setUploadedMedia(mappedMedia);
      form.setFieldsValue({
        caption: content.caption,
        scheduledAt: content.scheduledAt ? dayjs(content.scheduledAt) : null,
        status: content.status,
        platforms: content.platforms,
        clientId: content.clientId,
        projectId: content.projectId,
      });
      setFormSelectedClientId(content.clientId);
    } else {
      setEditingContent(null);
      setUploadedMedia([]);
      setFormSelectedClientId(undefined);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    // Revoke all blob URLs to prevent memory leaks
    uploadedMedia.forEach(media => {
      if (media.previewUrl) {
        URL.revokeObjectURL(media.previewUrl);
      }
    });
    setModalVisible(false);
    setEditingContent(null);
    setFormSelectedClientId(undefined);
    setUploadedMedia([]);
    form.resetFields();
  };

  // Handle preview
  const handlePreview = (content: ContentCalendarItem) => {
    setPreviewingContent(content);
    setPreviewModalVisible(true);
  };

  // Handle preview modal close
  const handleClosePreview = () => {
    setPreviewModalVisible(false);
    setPreviewingContent(null);
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      console.log('=== FORM SUBMISSION DEBUG ===');
      console.log('uploadedMedia state:', uploadedMedia);
      console.log('uploadedMedia count:', uploadedMedia.length);

      // Filter out local-only media (not uploaded to backend)
      const localMediaCount = uploadedMedia.filter(m => m.isLocal).length;
      if (localMediaCount > 0) {
        message.warning(`${localMediaCount} media file(s) are local-only and won't be saved to the server. Please configure R2 storage for persistent uploads.`);
      }

      // Only include media that was successfully uploaded to backend
      const serverMedia = uploadedMedia.filter(m => !m.isLocal).map((m, index) => ({
        url: m.url,
        key: m.key,
        mimeType: m.mimeType,
        size: m.size,
        thumbnailUrl: m.thumbnailUrl,
        thumbnailKey: m.thumbnailKey,
        order: m.order !== undefined ? m.order : index, // Preserve order
      }));

      const contentData: CreateContentDto | UpdateContentDto = {
        caption: values.caption,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : undefined,
        status: values.status || CONTENT_STATUS.DRAFT,
        platforms: values.platforms || [],
        clientId: values.clientId,
        projectId: values.projectId,
        media: serverMedia,
      };

      console.log('Sending contentData:', contentData);
      console.log('Media array in payload:', contentData.media);

      if (editingContent) {
        updateMutation.mutate({ id: editingContent.id, data: contentData as UpdateContentDto });
      } else {
        createMutation.mutate(contentData as CreateContentDto);
      }
    } catch (error) {
      console.error('Form validation error:', error);
    }
  };

  // Handle media upload using customRequest (proper Ant Design pattern)
  const handleMediaUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    setUploading(true);
    setUploadProgress(0);
    try {
      // Create local preview URL immediately for better UX
      let previewUrl = URL.createObjectURL(file);
      let thumbnailUrl: string | undefined = undefined;

      // Generate thumbnail for videos
      if (isVideoFile(file)) {
        try {
          console.log('🎬 Generating video thumbnail...');
          thumbnailUrl = await generateVideoThumbnail(file, 1.0); // Capture at 1 second
          console.log('✅ Video thumbnail generated');
        } catch (error) {
          console.warn('⚠️ Failed to generate video thumbnail:', error);
          // Continue without thumbnail
        }
      }

      try {
        // Simulate progress for better UX
        setUploadProgress(30);

        // Try to upload to backend (R2) with thumbnail if available
        const result = await contentCalendarService.uploadMedia(file, thumbnailUrl);
        console.log('📤 Upload response:', result);

        setUploadProgress(80);

        // Backend wraps response: { data: { success, data: {...} } }
        if (result && 'data' in result && result.data && typeof result.data === 'object' && 'success' in result.data && result.data.success && 'data' in result.data && result.data.data) {
          const mediaData = result.data.data as any;
          const newMedia = {
            url: mediaData.url || previewUrl, // Fallback to local preview if backend URL is empty
            previewUrl: mediaData.thumbnailUrl || thumbnailUrl || previewUrl, // Use backend thumbnail first, then local, then blob URL
            key: mediaData.key,
            mimeType: mediaData.mimeType || file.type,
            size: mediaData.size || file.size,
            originalName: file.name, // Store original filename for downloads
            isLocal: false, // Explicitly mark as uploaded to server
            thumbnailUrl: mediaData.thumbnailUrl || thumbnailUrl, // Prefer backend thumbnail
            thumbnailKey: mediaData.thumbnailKey, // Store thumbnail key for deletion
            order: uploadedMedia.length, // Set order based on current count
          };
          // Use functional update to avoid stale closure
          setUploadedMedia((prev) => {
            console.log('✅ Adding media to state (before):', prev);
            console.log('✅ Adding media object:', newMedia);
            const updated = [...prev, newMedia];
            console.log('✅ Updated state (after):', updated);
            return updated;
          });
          setUploadProgress(100);
          message.success(`File uploaded: ${file.name}`);
          onSuccess?.(mediaData);
        } else {
          throw new Error('Invalid upload response structure');
        }
      } catch (uploadError) {
        // If backend upload fails (e.g., R2 not configured), use local-only mode
        console.warn('⚠️ Backend upload failed, using local preview only:', uploadError);

        const localMedia = {
          url: previewUrl,
          previewUrl: thumbnailUrl || previewUrl, // Use thumbnail for videos
          key: `local-${Date.now()}-${file.name}`, // Generate local key
          mimeType: file.type,
          size: file.size,
          originalName: file.name, // Store original filename for downloads
          isLocal: true, // Flag to indicate this is local-only
          thumbnailUrl, // Store separate thumbnail URL for videos
          order: uploadedMedia.length, // Set order
        };

        setUploadedMedia((prev) => {
          console.log('✅ Adding local media to state:', localMedia);
          const updated = [...prev, localMedia];
          return updated;
        });

        setUploadProgress(100);
        message.warning(`File added locally: ${file.name} (backend storage unavailable)`);
        onSuccess?.(localMedia);
      }
    } catch (error) {
      message.error(`Upload failed: ${file.name}`);
      console.error('❌ Upload error:', error);
      onError?.(error);
      setUploadProgress(0);
    } finally {
      setUploading(false);
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Handle multiple file uploads with validation
  const handleBeforeUpload = (file: File, fileList: File[]) => {
    const platforms = form.getFieldValue('platforms') || [];

    // Check platform limits
    const totalMedia = uploadedMedia.length + fileList.length;
    if (platforms.length > 0) {
      const limit = getMediaLimitForPlatforms(platforms);
      if (totalMedia > limit) {
        const platformInfo = platforms.map((p: string) => PLATFORM_MEDIA_LIMITS[p as keyof typeof PLATFORM_MEDIA_LIMITS].description).join(', ');
        message.error(`Cannot upload: Total media (${totalMedia}) exceeds platform limit (${limit}). ${platformInfo}`);
        return Upload.LIST_IGNORE;
      }
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error(`File ${file.name} is too large. Maximum size is 100MB.`);
      return Upload.LIST_IGNORE;
    }

    return true;
  };

  // Handle media remove
  const handleMediaRemove = (index: number) => {
    const media = uploadedMedia[index];
    // Revoke blob URL to prevent memory leak
    if (media.previewUrl) {
      URL.revokeObjectURL(media.previewUrl);
    }
    const newMedia = [...uploadedMedia];
    newMedia.splice(index, 1);
    setUploadedMedia(newMedia);
  };

  // Handle media download
  const handleMediaDownload = async (media: any) => {
    try {
      // Priority: previewUrl (blob) > proxy URL > direct URL
      const downloadUrl = media.previewUrl || getProxyUrl(media.url);
      await downloadSingleMedia(downloadUrl, media.originalName || `media-${Date.now()}`);
      message.success(`Downloaded: ${media.originalName || 'media file'}`);
    } catch (error) {
      message.error('Download failed');
      console.error('Download error:', error);
    }
  };

  // Handle bulk download
  const handleBulkDownload = async () => {
    const data = contentsData as any;
    const contents = (data?.data?.data || []) as ContentCalendarItem[];
    const selectedContent = contents.filter(
      (item: ContentCalendarItem) => selectedRowKeys.includes(item.id)
    );
    const allMedia = selectedContent.flatMap((item: ContentCalendarItem) => (item.media || []) as any[]);

    if (allMedia.length === 0) {
      message.warning('No media files found in selected items');
      return;
    }

    let mediaToDownload = allMedia;
    if (allMedia.length > 20) {
      message.warning('Limit is 20 files. First 20 will be downloaded.');
      mediaToDownload = allMedia.slice(0, 20);
    }

    try {
      await downloadMediaAsZip(
        mediaToDownload.map((m: any) => ({
          url: m.url,
          originalName: m.originalName,
          id: m.id || m.key,
        })),
        `content-media-${Date.now()}.zip`
      );
      message.success(`Downloaded ${mediaToDownload.length} files as ZIP`);
    } catch (error) {
      message.error('Bulk download failed');
      console.error('Bulk download error:', error);
    }
  };

  // Handle bulk publish
  const handleBulkPublish = async () => {
    try {
      const promises = selectedRowKeys.map((id) =>
        contentCalendarService.publishContent(id)
      );
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
      message.success(`Published ${selectedRowKeys.length} items`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('Some items failed to publish');
      console.error('Bulk publish error:', error);
    }
  };

  // Handle bulk archive
  const handleBulkArchive = async () => {
    try {
      const promises = selectedRowKeys.map((id) =>
        contentCalendarService.archiveContent(id)
      );
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
      message.success(`Archived ${selectedRowKeys.length} items`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('Some items failed to archive');
      console.error('Bulk archive error:', error);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      const promises = selectedRowKeys.map((id) =>
        contentCalendarService.deleteContent(id)
      );
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['content-calendar'] });
      message.success(`Deleted ${selectedRowKeys.length} items`);
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('Some items failed to delete');
      console.error('Bulk delete error:', error);
    }
  };

  // Handle content duplication
  const handleDuplicate = async (item: ContentCalendarItem) => {
    try {
      const duplicated: CreateContentDto = {
        caption: `${item.caption} (Copy)`,
        platforms: item.platforms,
        clientId: item.clientId,
        projectId: item.projectId,
        status: CONTENT_STATUS.DRAFT,
        media: item.media?.map((m: any) => ({
          url: m.url,
          key: m.key,
          mimeType: m.mimeType,
          size: m.size,
          width: m.width,
          height: m.height,
          duration: m.duration,
          originalName: m.originalName,
          thumbnailUrl: m.thumbnailUrl,
          thumbnailKey: m.thumbnailKey,
        })),
      };

      await createMutation.mutateAsync(duplicated);
      message.success('Content duplicated successfully');
    } catch (error) {
      message.error('Failed to duplicate content');
      console.error('Duplicate error:', error);
    }
  };

  // Handle PDF export
  const handleExportPDF = () => {
    try {
      const responseData = contentsData as any;
      const data = responseData?.data?.data || [];
      let exportTitle = 'Content Calendar';

      if (lockedProjectId || projectFilter) {
        const projectId = lockedProjectId || projectFilter;
        const project = projects?.find((p: any) => p.id === projectId);
        if (project) {
          exportTitle = `Content Calendar - ${project.number} ${project.description}`;
        }
      }

      const filename = exportContentToPDF(data, exportTitle);
      message.success(`PDF exported: ${filename}`);
    } catch (error) {
      message.error('Failed to export PDF');
      console.error('PDF export error:', error);
    }
  };

  // Table columns
  const columns: ColumnsType<ContentCalendarItem> = [
    {
      title: 'Caption',
      dataIndex: 'caption',
      key: 'caption',
      width: 350,
      ellipsis: true,
      render: (caption: string, record: ContentCalendarItem) => (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {caption.length > 100 ? `${caption.substring(0, 100)}...` : caption}
          </div>
          {record.media.length > 0 && (
            <Tag icon={record.media[0].type === 'VIDEO' ? <VideoCameraOutlined /> : <FileImageOutlined />}>
              {record.media.length} {record.media.length === 1 ? 'file' : 'files'}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
      width: 150,
      render: (text: string) => text || '-',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'number'],
      key: 'project',
      width: 120,
      render: (text: string, record: ContentCalendarItem) => (
        record.project ? (
          <Tooltip title={record.project.description}>
            <span>{text}</span>
          </Tooltip>
        ) : '-'
      ),
    },
    {
      title: 'Platforms',
      dataIndex: 'platforms',
      key: 'platforms',
      width: 200,
      render: (platforms: string[]) => (
        <>
          {platforms.map((platform) => {
            const platformConfig = PLATFORMS.find((p) => p.value === platform);
            return (
              <Tag key={platform} color={platformConfig?.color}>
                {platformConfig?.label || platform}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag icon={getStatusIcon(status)} color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Scheduled At',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      width: 150,
      render: (date: string) => (date ? dayjs(date).format('MMM DD, YYYY HH:mm') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: ContentCalendarItem) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(record);
              }}
            />
          </Tooltip>
          {record.status !== CONTENT_STATUS.PUBLISHED && (
            <Tooltip title="Publish">
              <Popconfirm
                title="Publish this content?"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  publishMutation.mutate(record.id);
                }}
              >
                <Button
                  type="text"
                  icon={<RocketOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {record.status !== CONTENT_STATUS.ARCHIVED && (
            <Tooltip title="Archive">
              <Popconfirm
                title="Archive this content?"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  archiveMutation.mutate(record.id);
                }}
              >
                <Button
                  type="text"
                  icon={<InboxOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Duplicate">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this content? This will also delete all associated media files."
              onConfirm={(e) => {
                e?.stopPropagation();
                deleteMutation.mutate(record.id);
              }}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Filter data based on search query (client-side filtering)
  const filteredData = useMemo(() => {
    const responseData = contentsData as any;
    let result = Array.isArray(responseData?.data?.data) ? responseData.data.data : [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item: ContentCalendarItem) =>
        item.caption.toLowerCase().includes(query) ||
        item.platforms.some((platform) => platform.toLowerCase().includes(query))
      );
    }

    return result;
  }, [contentsData, searchQuery]);

  // Row selection configuration for bulk operations
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <h2 style={{ margin: 0 }}>Content Calendar</h2>
          </Col>
          <Col>
            <Space>
              {/* Project Quick Switcher - Stay in content calendar context */}
              {!lockedProjectId && (
                <Select
                  showSearch
                  placeholder="Quick Switch Project"
                  value={projectFilter}
                  onChange={(value) => {
                    // Just update the filter, don't navigate away
                    setProjectFilter(value);
                  }}
                  style={{ width: 250 }}
                  allowClear
                  filterOption={(input, option) => {
                    const label = option?.children?.toString() || '';
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {Array.isArray(projects) && projects.map((project) => (
                    <Option key={project.id} value={project.id}>
                      <Space>
                        <Tag color="blue">{project.number}</Tag>
                        {project.description}
                        {project.client && (
                          <Tag color="purple" style={{ fontSize: '10px' }}>
                            {project.client.name}
                          </Tag>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
              )}

              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                allowClear
              />
              <Segmented
                options={[
                  { label: 'List', value: 'list', icon: <UnorderedListOutlined /> },
                  { label: 'Grid', value: 'grid', icon: <AppstoreOutlined /> },
                  { label: 'Board', value: 'kanban', icon: <ProjectOutlined /> },
                  { label: 'Calendar', value: 'calendar', icon: <CalendarOutlined /> },
                ]}
                value={viewMode}
                onChange={(value) => setViewMode(value as 'list' | 'grid' | 'kanban' | 'calendar')}
              />
              <Button
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
              >
                Export PDF
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal()}
              >
                Create Content
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Bulk actions toolbar */}
        {selectedRowKeys.length > 0 && (
          <Row style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Card size="small" style={{ background: token.colorPrimaryBg }}>
                <Space wrap>
                  <Tag color="blue">{selectedRowKeys.length} selected</Tag>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleBulkDownload}
                  >
                    Download Media
                  </Button>
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={handleBulkPublish}
                    type="primary"
                  >
                    Publish
                  </Button>
                  <Button
                    icon={<InboxOutlined />}
                    onClick={handleBulkArchive}
                  >
                    Archive
                  </Button>
                  <Popconfirm
                    title={`Delete ${selectedRowKeys.length} items?`}
                    description="This action cannot be undone."
                    onConfirm={handleBulkDelete}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                  <Button onClick={() => setSelectedRowKeys([])}>
                    Clear Selection
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* Filter Presets */}
        {!lockedProjectId && (
          <Row style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Space>
                <StarOutlined style={{ color: token.colorWarning }} />
                <Select
                  placeholder="Saved Filter Presets"
                  allowClear
                  style={{ width: 250 }}
                  onChange={(presetId) => {
                    if (presetId) {
                      const filters = applyPreset(presetId);
                      if (filters) {
                        setStatusFilter(filters.status as any);
                        setPlatformFilter(filters.platform);
                        setClientFilter(filters.clientId);
                        setProjectFilter(filters.projectId);
                        message.success('Filter preset applied');
                      }
                    }
                  }}
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Space style={{ padding: '0 8px 4px' }}>
                        <Button
                          type="text"
                          icon={<SaveOutlined />}
                          onClick={() => {
                            const name = prompt('Enter preset name:');
                            if (name) {
                              savePreset(name, {
                                status: statusFilter,
                                platform: platformFilter,
                                clientId: clientFilter,
                                projectId: projectFilter,
                              });
                              message.success('Preset saved');
                            }
                          }}
                          block
                        >
                          Save Current Filters
                        </Button>
                      </Space>
                    </>
                  )}
                >
                  {presets.map((preset) => (
                    <Option key={preset.id} value={preset.id}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        {preset.name}
                        <Button
                          type="text"
                          size="small"
                          danger
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id);
                            message.success('Preset deleted');
                          }}
                          style={{ marginLeft: 8 }}
                        >
                          ×
                        </Button>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
          </Row>
        )}

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Status"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              {Object.values(CONTENT_STATUS).map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Platform"
              allowClear
              style={{ width: '100%' }}
              value={platformFilter}
              onChange={setPlatformFilter}
            >
              {PLATFORMS.map((platform) => (
                <Option key={platform.value} value={platform.value}>
                  {platform.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Filter by Client"
              allowClear={canChangeClient}
              style={{ width: '100%' }}
              value={clientFilter}
              onChange={canChangeClient ? setClientFilter : undefined}
              disabled={!canChangeClient}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label?.toString() || option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {Array.isArray(clients) && clients.map((client) => (
                <Option key={client.id} value={client.id}>
                  {client.name}
                </Option>
              ))}
            </Select>
          </Col>
          {!hideProjectFilter && (
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Filter by Project"
                allowClear={canChangeProject}
                style={{ width: '100%' }}
                value={projectFilter}
                onChange={canChangeProject ? setProjectFilter : undefined}
                disabled={!canChangeProject}
                showSearch
              filterOption={(input, option) => {
                const label = option?.label?.toString() || option?.children?.toString() || '';
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {Array.isArray(projects) && projects.map((project) => (
                <Option key={project.id} value={project.id}>
                  {project.number} - {project.description}
                </Option>
              ))}
            </Select>
            </Col>
          )}
        </Row>

        {/* Mobile-friendly view rendering */}
        {viewMode === 'list' ? (
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={isLoading}
            rowKey="id"
            rowSelection={rowSelection}
            scroll={{ x: 1500 }}
            pagination={{
              showTotal: (total) => `Total ${total} items`,
              showSizeChanger: true,
            }}
            onRow={(record) => ({
              onClick: () => handlePreview(record),
              style: { cursor: 'pointer' },
            })}
          />
        ) : viewMode === 'grid' ? (
          <ContentGridView
            data={filteredData}
            onEdit={handleOpenModal}
            onDelete={(id) => deleteMutation.mutate(id)}
            onDownload={handleMediaDownload}
            onPreview={handlePreview}
            loading={isLoading}
          />
        ) : viewMode === 'kanban' ? (
          <div>
            <KanbanBoardView
              data={filteredData}
              onStatusChange={(id, newStatus) => {
                updateMutation.mutate({
                  id,
                  data: { status: newStatus as any },
                });
              }}
              onEdit={handleOpenModal}
              onPreview={handlePreview}
              loading={isLoading}
            />
          </div>
        ) : (
          <CalendarView
            data={filteredData}
            onDateClick={(date) => {
              // Open create modal with pre-selected date
              form.setFieldsValue({ scheduledAt: dayjs(date) });
              setModalVisible(true);
              setEditingContent(null);
            }}
            onEventClick={(item) => handleOpenModal(item)}
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingContent ? 'Edit Content' : 'Create Content'}
        open={modalVisible}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        width={800}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="caption"
            label="Caption"
            rules={[{ required: true, message: 'Please enter a caption' }]}
            tooltip="Social media post text (supports line breaks, hashtags, emojis)"
          >
            <TextArea
              rows={6}
              placeholder="Write your social media caption here...&#10;&#10;You can include:&#10;• Emojis 🎉&#10;• Hashtags #example&#10;• Line breaks for formatting"
              showCount
              maxLength={2200}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientId" label="Client">
                <Select
                  placeholder="Select client (optional)"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={handleClientChange}
                >
                  {Array.isArray(clients) && clients.map((client) => (
                    <Option key={client.id} value={client.id}>
                      {client.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="projectId" label="Project">
                <Select
                  placeholder="Select project (optional)"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={handleProjectChange}
                >
                  {filteredProjects.map((project) => (
                    <Option key={project.id} value={project.id}>
                      {project.number} - {project.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="scheduledAt" label="Scheduled At">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="Status">
            <Select placeholder="Select status">
              {Object.values(CONTENT_STATUS).map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="platforms" label="Platforms">
            <Select mode="multiple" placeholder="Select platforms">
              {PLATFORMS.map((platform) => (
                <Option key={platform.value} value={platform.value}>
                  {platform.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Media (Carousel)">
            {/* Platform limit info */}
            {platforms?.length > 0 && (
              <Alert
                message={`Media Limit: ${uploadedMedia.length}/${getMediaLimitForPlatforms(platforms || [])} ${validateMediaForPlatforms(platforms || [], uploadedMedia.length).warnings ? '(At limit!)' : ''}`}
                description={
                  <div>
                    {platforms.map((p: string) => {
                      const limitInfo = PLATFORM_MEDIA_LIMITS[p as keyof typeof PLATFORM_MEDIA_LIMITS];
                      return (
                        <Tag key={p} style={{ marginBottom: 4 }}>
                          {limitInfo?.icon} {p}: Max {limitInfo?.maxMedia}
                        </Tag>
                      );
                    })}
                  </div>
                }
                type={validateMediaForPlatforms(platforms || [], uploadedMedia.length).warnings ? 'warning' : 'info'}
                showIcon
                icon={<FileImageOutlined />}
                style={{ marginBottom: 12 }}
              />
            )}

            {/* Drag & Drop Upload */}
            <Dragger
              customRequest={handleMediaUpload}
              beforeUpload={handleBeforeUpload}
              showUploadList={false}
              accept="image/*,video/*"
              disabled={uploading}
              multiple={true}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag files to upload</p>
              <p className="ant-upload-hint">
                Support for images and videos. Max 100MB per file.
                {platforms?.length > 0 && ` (Max ${getMediaLimitForPlatforms(platforms || [])} files total)`}
              </p>
            </Dragger>

            {/* Upload Progress */}
            {uploading && uploadProgress > 0 && (
              <Progress percent={uploadProgress} status="active" style={{ marginBottom: 16 }} />
            )}

            {/* Sortable Media Gallery */}
            {uploadedMedia.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ marginBottom: 12, color: token.colorTextSecondary, fontSize: '13px' }}>
                  <HolderOutlined /> Drag to reorder carousel • {uploadedMedia.length} file{uploadedMedia.length > 1 ? 's' : ''}
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={uploadedMedia.map((_, idx) => `media-${idx}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      {uploadedMedia.map((media, index) => (
                        <SortableMediaItem
                          key={`media-${index}`}
                          media={media}
                          index={index}
                          onRemove={handleMediaRemove}
                          onDownload={handleMediaDownload}
                          token={token}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <ContentPreviewModal
        open={previewModalVisible}
        content={previewingContent}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default ContentCalendarPage;
