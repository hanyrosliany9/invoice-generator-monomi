import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Card, Space, Tag, Image, Empty, Spin, theme } from 'antd';
import { CalendarOutlined, VideoCameraOutlined } from '@ant-design/icons';
import type { ContentCalendarItem } from '../../services/content-calendar';
import { getProxyUrl } from '../../utils/mediaProxy';

// Note: Colors will be replaced with theme tokens in component
const COLUMNS = {
  DRAFT: { title: 'Draft', colorKey: 'colorTextSecondary' as const },
  SCHEDULED: { title: 'Scheduled', colorKey: 'colorPrimary' as const },
  PUBLISHED: { title: 'Published', colorKey: 'colorSuccess' as const },
  ARCHIVED: { title: 'Archived', colorKey: 'colorWarning' as const },
} as const;

type StatusKey = keyof typeof COLUMNS;

interface Props {
  data: ContentCalendarItem[];
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (item: ContentCalendarItem) => void;
  onPreview: (item: ContentCalendarItem) => void;
  loading?: boolean;
}

// Draggable card component
function DraggableCard({
  item,
  onEdit,
  onPreview,
  isDragging,
  token,
}: {
  item: ContentCalendarItem;
  onEdit: (item: ContentCalendarItem) => void;
  onPreview: (item: ContentCalendarItem) => void;
  isDragging?: boolean;
  token: any;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        marginBottom: 8,
        cursor: 'grabbing',
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }
    : {
        marginBottom: 8,
        cursor: 'grab',
        opacity: 1,
      };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        hoverable
        size="small"
        onClick={() => !isDragging && onPreview(item)}
        cover={
          item.media && item.media.length > 0 ? (
            <div style={{ position: 'relative', height: 120, overflow: 'hidden' }}>
              {item.media[0].type === 'IMAGE' || item.media[0].mimeType?.startsWith('image') ? (
                <img
                  src={getProxyUrl(item.media[0].url)}
                  alt={item.caption}
                  height={120}
                  width="100%"
                  style={{ objectFit: 'cover' }}
                />
              ) : item.media[0].thumbnailUrl ? (
                <div style={{ position: 'relative', height: 120 }}>
                  <img
                    src={getProxyUrl(item.media[0].thumbnailUrl)}
                    height={120}
                    width="100%"
                    style={{ objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
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
                    height: 120,
                    background: token.colorFillSecondary,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: token.colorText,
                    gap: 4,
                  }}
                >
                  <VideoCameraOutlined style={{ fontSize: 40, color: token.colorPrimary }} />
                  <span style={{ fontSize: 10, color: token.colorTextSecondary }}>Video</span>
                </div>
              )}
            </div>
          ) : null
        }
      >
        <Card.Meta
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {/* Caption preview */}
              <div
                style={{
                  fontSize: '12px',
                  color: token.colorText,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '16px',
                  marginBottom: 4,
                }}
                title={item.caption}
              >
                {item.caption}
              </div>

              {/* Platforms */}
              <div style={{ fontSize: '12px' }}>
                {item.platforms.slice(0, 2).map((platform) => (
                  <Tag key={platform} style={{ fontSize: '11px', marginBottom: 4 }}>
                    {platform}
                  </Tag>
                ))}
                {item.platforms.length > 2 && (
                  <Tag style={{ fontSize: '11px', marginBottom: 4 }}>
                    +{item.platforms.length - 2}
                  </Tag>
                )}
              </div>

              {/* Scheduled date */}
              {item.scheduledAt && (
                <Space style={{ fontSize: '11px', color: token.colorTextSecondary }}>
                  <CalendarOutlined />
                  {new Date(item.scheduledAt).toLocaleDateString()}
                </Space>
              )}

              {/* Media count */}
              {item.media && item.media.length > 0 && (
                <Tag style={{ fontSize: '11px' }}>{item.media.length} file(s)</Tag>
              )}
            </Space>
          }
        />
      </Card>
    </div>
  );
}

// Droppable column component
function DroppableColumn({
  status,
  config,
  items,
  activeId,
  onEdit,
  onPreview,
  token,
}: {
  status: string;
  config: { title: string; colorKey: string };
  items: ContentCalendarItem[];
  activeId: string | null;
  onEdit: (item: ContentCalendarItem) => void;
  onPreview: (item: ContentCalendarItem) => void;
  token: any;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const columnColor = token[config.colorKey];

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 300,
        maxWidth: 350,
        flex: 1,
        background: isOver ? token.colorPrimaryBg : token.colorBgLayout,
        borderRadius: token.borderRadiusLG,
        padding: '16px',
        transition: 'background 0.2s',
      }}
    >
      <Card
        title={
          <Space>
            <span>{config.title}</span>
            <Tag color={columnColor}>{items.length || 0}</Tag>
          </Space>
        }
        variant="borderless"
        styles={{
          header: {
            background: `${columnColor}20`,
            borderRadius: `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0`,
          },
          body: { padding: '8px' },
        }}
      >
        <div style={{ minHeight: 400 }}>
          {items.length > 0 ? (
            items.map((item) => (
              <DraggableCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onPreview={onPreview}
                isDragging={activeId === item.id}
                token={token}
              />
            ))
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No content"
              style={{ marginTop: 40 }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

export const KanbanBoardView: React.FC<Props> = ({
  data,
  onStatusChange,
  onEdit,
  onPreview,
  loading,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { token } = theme.useToken();

  // Group by status
  const columnData = Object.keys(COLUMNS).reduce((acc, status) => {
    acc[status as StatusKey] = data.filter((item) => item.status === status);
    return acc;
  }, {} as Record<StatusKey, ContentCalendarItem[]>);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Check if we're dropping on a column (status)
      const newStatus = over.id as string;
      if (Object.keys(COLUMNS).includes(newStatus)) {
        onStatusChange(active.id as string, newStatus);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeItem = activeId ? data.find((item) => item.id === activeId) : null;

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spin size="large" tip="Loading content..." />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          minHeight: '60vh',
          paddingBottom: 16,
        }}
      >
        {(Object.entries(COLUMNS) as [StatusKey, typeof COLUMNS[StatusKey]][]).map(
          ([status, config]) => (
            <DroppableColumn
              key={status}
              status={status}
              config={config}
              items={columnData[status] || []}
              activeId={activeId}
              onEdit={onEdit}
              onPreview={onPreview}
              token={token}
            />
          )
        )}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div style={{ width: 300, cursor: 'grabbing' }}>
            <DraggableCard item={activeItem} onEdit={onEdit} onPreview={onPreview} isDragging token={token} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
