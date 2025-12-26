import React from 'react'
import { Button, Space, Tag, Avatar, Divider, Modal, message } from 'antd'
import { EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { CalendarEvent } from '../../../services/calendar-events'
import { useDeleteCalendarEvent } from '../../../hooks/useCalendarEvents'
import {
  getCategoryColor,
  getCategoryLabel,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  formatEventTime,
  formatEventDuration,
} from '../../../utils/calendar-colors'

interface EventDetailPanelProps {
  event: CalendarEvent
  onEdit: () => void
  onClose: () => void
  onDelete: () => void
}

export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({
  event,
  onEdit,
  onClose,
  onDelete,
}) => {
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteCalendarEvent()

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Event',
      content: `Are you sure you want to delete "${event.title}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        deleteEvent(event.id, {
          onSuccess: () => {
            onClose()
            onDelete()
          },
        })
      },
    })
  }

  return (
    <div className="event-detail-panel">
      {/* Header */}
      <div className="event-detail-panel-header">
        <h3 className="event-detail-panel-title">{event.title}</h3>
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={onClose}
        />
      </div>

      {/* Content */}
      <div className="event-detail-panel-content">
        {/* Date & Time */}
        <div className="event-detail-item">
          <div className="event-detail-label">Date & Time</div>
          <div className="event-detail-value">
            {dayjs(event.startTime).format('ddd, MMM DD, YYYY')}
          </div>
          <div className="event-detail-value" style={{ marginTop: '4px' }}>
            {formatEventTime(event.startTime, event.endTime, event.allDay)}
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
            {formatEventDuration(event.startTime, event.endTime)}
          </div>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Category */}
        <div className="event-detail-item">
          <div className="event-detail-label">Category</div>
          <Tag color={getCategoryColor(event.category)}>
            {getCategoryLabel(event.category)}
          </Tag>
        </div>

        {/* Status */}
        <div className="event-detail-item">
          <div className="event-detail-label">Status</div>
          <Tag color={getStatusColor(event.status)}>
            {getStatusLabel(event.status)}
          </Tag>
        </div>

        {/* Priority */}
        {event.priority && (
          <div className="event-detail-item">
            <div className="event-detail-label">Priority</div>
            <Tag color={getPriorityColor(event.priority)}>
              {getPriorityLabel(event.priority)}
            </Tag>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Description */}
        {event.description && (
          <div className="event-detail-item">
            <div className="event-detail-label">Description</div>
            <div className="event-detail-value">{event.description}</div>
          </div>
        )}

        {/* Location */}
        {event.location && (
          <div className="event-detail-item">
            <div className="event-detail-label">Location</div>
            <div className="event-detail-value">{event.location}</div>
          </div>
        )}

        {/* Project */}
        {event.project && (
          <div className="event-detail-item">
            <div className="event-detail-label">Project</div>
            <div className="event-detail-value">{event.project.number}</div>
          </div>
        )}

        {/* Milestone */}
        {event.milestone && (
          <div className="event-detail-item">
            <div className="event-detail-label">Milestone</div>
            <div className="event-detail-value">{event.milestone.name}</div>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Assignee */}
        {event.assignee && (
          <div className="event-detail-item">
            <div className="event-detail-label">Assigned To</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
                {event.assignee.name[0]?.toUpperCase()}
              </Avatar>
              <div>
                <div className="event-detail-value">{event.assignee.name}</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {event.assignee.email}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="event-detail-item">
            <div className="event-detail-label">Attendees ({event.attendees.length})</div>
            <Space wrap>
              {event.attendees.map((attendee) => (
                <Avatar
                  key={attendee.userId}
                  title={`${attendee.user.name} - ${attendee.status}`}
                  style={{ backgroundColor: '#1890ff' }}
                >
                  {attendee.user.name[0]?.toUpperCase()}
                </Avatar>
              ))}
            </Space>
          </div>
        )}

        <Divider style={{ margin: '12px 0' }} />

        {/* Metadata */}
        <div className="event-detail-item">
          <div className="event-detail-label">Created By</div>
          <div className="event-detail-value">
            {event.createdBy?.name}
          </div>
        </div>

        <div className="event-detail-item">
          <div className="event-detail-label">Created At</div>
          <div className="event-detail-value">
            {dayjs(event.createdAt).format('MMM DD, YYYY HH:mm')}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="event-detail-panel-footer">
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDelete}
          loading={isDeleting}
        >
          Delete
        </Button>
        <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  )
}
