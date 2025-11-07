// BusinessJourneyTimeline Component - Indonesian Business Management System
// Enhanced with accessibility, performance optimization, and cultural UX patterns

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Timeline,
} from 'antd'
import { WarningOutlined, WhatsAppOutlined } from '@ant-design/icons'
// import { FixedSizeList as List } from 'react-window' // Temporarily disabled
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'

import {
  BusinessJourneyData,
  BusinessJourneyEvent,
  BusinessJourneyFilters,
  BusinessJourneyTimelineProps,
} from './types/businessJourney.types'

import {
  announceToScreenReader,
  businessJourneyUtils,
  filterEvents,
  formatIDR,
  formatIDRForScreenReader,
  generateAriaLabel,
  getEventColor,
  getEventIcon,
  getEventTitle,
} from './utils/businessJourneyUtils'

import { useUXMetrics } from './utils/uxMetrics'
import styles from './BusinessJourneyTimeline.module.css'

const { RangePicker } = DatePicker
const { Option } = Select

interface BusinessJourneyTimelineState {
  filters: BusinessJourneyFilters
  selectedEvents: Set<string>
  expandedEvents: Set<string>
  isFiltersVisible: boolean
  announcedEvents: Set<string>
}

export const BusinessJourneyTimeline: React.FC<
  BusinessJourneyTimelineProps
> = ({
  clientId,
  maxEvents = 50,
  showFilters = true,
  enableVirtualization = true, // Not used but kept for API compatibility
  userPermissions = {
    canViewFinancials: true,
    canViewPersonalData: true,
    canEditEvents: false,
    canDeleteEvents: false,
    canExportData: true,
  },
  dataPrivacyLevel = 'standard',
  onEventClick,
  onFilterChange,
  className,
}) => {
  const { trackInteraction, trackError } = useUXMetrics(
    'BusinessJourneyTimeline'
  )

  // Component state
  const [state, setState] = useState<BusinessJourneyTimelineState>({
    filters: {
      eventTypes: [],
      dateRange: {
        start: dayjs().subtract(6, 'months').toISOString(),
        end: dayjs().toISOString(),
      },
      statusFilter: [],
      searchTerm: '',
    },
    selectedEvents: new Set(),
    expandedEvents: new Set(),
    isFiltersVisible: false,
    announcedEvents: new Set(),
  })

  // Refs for accessibility
  const timelineRef = useRef<HTMLDivElement>(null)
  const announceRef = useRef<HTMLDivElement>(null)

  // Virtualization configuration (future enhancement)
  // Virtualization enabled status available for debugging

  // Fetch business journey data
  const {
    data: journeyData,
    isLoading,
    error,
    refetch,
  } = useQuery<BusinessJourneyData>({
    queryKey: ['businessJourney', clientId, state.filters],
    queryFn: async () => {
      const response = await fetch(`/api/business-journey/${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.filters),
      })
      if (!response.ok) throw new Error('Failed to fetch business journey data')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })

  // Process and filter events
  const processedEvents = useMemo(() => {
    if (!journeyData?.events) return []

    return journeyData.events
      .map(event => ({
        ...event,
        formattedDate: dayjs(event.createdAt).format('DD MMM YYYY, HH:mm'),
        formattedAmount: event.amount ? formatIDR(event.amount) : null,
        statusColor: getEventColor(event.type, event.status),
        ariaLabel: generateAriaLabel(event),
      }))
      .filter(event => {
        // Apply privacy filters
        if (!userPermissions.canViewFinancials && event.amount) {
          return { ...event, amount: undefined }
        }

        if (dataPrivacyLevel === 'restricted' && event.metadata.userCreated) {
          return {
            ...event,
            metadata: {
              ...event.metadata,
              userCreated: 'System User',
            },
          }
        }

        return event
      })
      .slice(0, maxEvents)
  }, [journeyData, userPermissions, dataPrivacyLevel, maxEvents])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return filterEvents(processedEvents, state.filters)
  }, [processedEvents, state.filters])

  // Event handlers
  const handleEventClick = useCallback(
    (event: BusinessJourneyEvent) => {
      const trackClick = trackInteraction('event_click', event.id)

      try {
        // Announce to screen reader
        if (!state.announcedEvents.has(event.id)) {
          announceToScreenReader(
            `Membuka detail ${getEventTitle(event.type, 'id')}`
          )
          setState(prev => ({
            ...prev,
            announcedEvents: new Set([...prev.announcedEvents, event.id]),
          }))
        }

        onEventClick?.(event)
      } catch (error) {
        trackError(error as Error, 'event_click_handler')
      } finally {
        trackClick()
      }
    },
    [onEventClick, trackInteraction, trackError, state.announcedEvents]
  )

  const handleFilterChange = useCallback(
    (newFilters: Partial<BusinessJourneyFilters>) => {
      const trackFilter = trackInteraction('filter_change')

      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, ...newFilters },
      }))

      onFilterChange?.({ ...state.filters, ...newFilters })
      trackFilter()
    },
    [state.filters, onFilterChange, trackInteraction]
  )

  const handleSearchChange = useCallback(
    businessJourneyUtils.debounce((searchTerm: string) => {
      handleFilterChange({ searchTerm })
    }, 300),
    [handleFilterChange]
  )

  // WhatsApp sharing
  const handleWhatsAppShare = useCallback(
    (event: BusinessJourneyEvent) => {
      if (!event.relatedEntity || !event.amount) return

      const trackShare = trackInteraction('whatsapp_share', event.id)

      try {
        const message = businessJourneyUtils.generateWhatsAppMessage(
          event.relatedEntity.type as 'quotation' | 'invoice',
          event.relatedEntity.number || event.relatedEntity.id,
          event.amount
        )

        const whatsappUrl = `https://wa.me/?text=${message}`
        window.open(whatsappUrl, '_blank')

        announceToScreenReader('Membuka WhatsApp untuk berbagi dokumen')
      } catch (error) {
        trackError(error as Error, 'whatsapp_share')
      } finally {
        trackShare()
      }
    },
    [trackInteraction, trackError]
  )

  // Timeline item renderer for virtualization
  const TimelineItem = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const event = filteredEvents[index]
      if (!event) return null

      return (
        <div style={style} className={styles['timelineItemWrapper']}>
          <Timeline.Item
            key={event.id}
            color={getEventColor(event.type, event.status)}
            dot={
              <button
                type='button'
                aria-label={`${event.title} - ${event.status}`}
                aria-describedby={`event-details-${event.id}`}
                className={styles['timelineDot']}
                onClick={() => handleEventClick(event)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleEventClick(event)
                  }
                }}
              >
                {getEventIcon(event.type)}
              </button>
            }
          >
            <div
              id={`event-details-${event.id}`}
              role='article'
              aria-labelledby={`event-title-${event.id}`}
              className={styles['eventContent']}
            >
              <div className={styles['eventHeader']}>
                <h3
                  id={`event-title-${event.id}`}
                  className={styles['eventTitle']}
                >
                  {getEventTitle(event.type, 'id')}
                </h3>
                <span className={styles['eventDate']}>
                  {dayjs(event.createdAt).format('DD/MM/YYYY HH:mm')}
                </span>
              </div>

              <p className={styles['eventDescription']}>{event.description}</p>

              {event.amount && userPermissions.canViewFinancials && (
                <div
                  role='text'
                  aria-label={`Jumlah: ${formatIDRForScreenReader(event.amount)}`}
                  className={styles['eventAmount']}
                >
                  {formatIDR(event.amount)}
                </div>
              )}

              {event.relatedEntity && (
                <div className={styles['eventActions']}>
                  <Space>
                    <Button
                      size='small'
                      type='link'
                      onClick={() => handleEventClick(event)}
                    >
                      Lihat Detail
                    </Button>

                    {event.amount && event.relatedEntity.type !== 'client' && (
                      <Button
                        size='small'
                        type='link'
                        icon={<WhatsAppOutlined />}
                        onClick={() => handleWhatsAppShare(event)}
                        style={{ color: '#25D366' }}
                      >
                        Kirim via WhatsApp
                      </Button>
                    )}
                  </Space>
                </div>
              )}
            </div>
          </Timeline.Item>
        </div>
      )
    },
    [
      filteredEvents,
      handleEventClick,
      handleWhatsAppShare,
      userPermissions.canViewFinancials,
    ]
  )

  // Materai compliance warning
  const materiCompliance = useMemo(() => {
    if (!journeyData?.materaiCompliance) return null

    const { compliancePercentage, pendingAmount } =
      journeyData.materaiCompliance

    if (compliancePercentage < 100 && pendingAmount > 0) {
      return (
        <Alert
          type='warning'
          icon={<WarningOutlined />}
          message='Materai Diperlukan'
          description={
            <div>
              <p>
                Terdapat invoice yang memerlukan materai sejumlah{' '}
                <strong>{formatIDR(pendingAmount)}</strong>
                sesuai peraturan Indonesia.
              </p>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Materai harus ditempel pada dokumen fisik</li>
                <li>
                  Materai dapat dibeli di kantor pos, bank, atau toko alat tulis
                </li>
                <li>Pastikan materai tidak rusak dan masih berlaku</li>
              </ul>
            </div>
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )
    }

    return null
  }, [journeyData?.materaiCompliance])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target === timelineRef.current ||
        timelineRef.current?.contains(e.target as Node)
      ) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          // Handle arrow key navigation between timeline items
          const buttons = timelineRef.current?.querySelectorAll(
            `.${styles['timelineDot']}`
          )
          if (!buttons) return

          const currentIndex = Array.from(buttons).findIndex(
            button => button === document.activeElement
          )
          let nextIndex = currentIndex

          if (e.key === 'ArrowDown') {
            nextIndex = Math.min(currentIndex + 1, buttons.length - 1)
          } else if (e.key === 'ArrowUp') {
            nextIndex = Math.max(currentIndex - 1, 0)
          }

          ;(buttons[nextIndex] as HTMLElement)?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <Card {...(className && { className })}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: 16 }}>Memuat perjalanan bisnis...</p>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card {...(className && { className })}>
        <Alert
          type='error'
          message='Gagal Memuat Data'
          description='Terjadi kesalahan saat memuat perjalanan bisnis. Silakan coba lagi.'
          action={
            <Button size='small' onClick={() => refetch()}>
              Coba Lagi
            </Button>
          }
        />
      </Card>
    )
  }

  // Empty state
  if (!filteredEvents.length) {
    return (
      <Card {...(className && { className })}>
        <Empty
          description='Belum ada aktivitas bisnis'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <p>
            Aktivitas bisnis akan muncul di sini setelah terjadi interaksi
            dengan klien.
          </p>
        </Empty>
      </Card>
    )
  }

  return (
    <div className={`${styles['businessJourneyContainer']} ${className || ''}`}>
      {/* Screen reader announcement area */}
      <div
        ref={announceRef}
        id='timeline-announcements'
        aria-live='polite'
        aria-atomic='false'
        className={styles['srOnly']}
      />

      {/* Materai compliance warning */}
      {materiCompliance}

      {/* Filters */}
      {showFilters && (
        <Card
          size='small'
          {...(styles['filtersCard'] && { className: styles['filtersCard'] })}
        >
          <Space wrap>
            <Input.Search
              placeholder='Cari aktivitas...'
              allowClear
              onChange={e => handleSearchChange(e.target.value)}
              style={{ width: 200 }}
              aria-label='Cari dalam perjalanan bisnis'
            />

            <RangePicker
              value={[
                state.filters.dateRange.start
                  ? dayjs(state.filters.dateRange.start)
                  : null,
                state.filters.dateRange.end
                  ? dayjs(state.filters.dateRange.end)
                  : null,
              ]}
              onChange={dates => {
                handleFilterChange({
                  dateRange: {
                    start: dates?.[0]?.toISOString() || '',
                    end: dates?.[1]?.toISOString() || '',
                  },
                })
              }}
              placeholder={['Dari tanggal', 'Sampai tanggal']}
              style={{ width: 240 }}
            />

            <Select
              mode='multiple'
              placeholder='Filter jenis aktivitas'
              value={state.filters.eventTypes}
              onChange={eventTypes => handleFilterChange({ eventTypes })}
              style={{ minWidth: 200 }}
              aria-label='Filter berdasarkan jenis aktivitas'
            >
              {[
                'client_created',
                'project_started',
                'quotation_sent',
                'quotation_approved',
                'invoice_generated',
                'payment_received',
              ].map(type => (
                <Option key={type} value={type}>
                  {getEventIcon(type as any)} {getEventTitle(type as any, 'id')}
                </Option>
              ))}
            </Select>
          </Space>
        </Card>
      )}

      {/* Timeline */}
      <Card
        {...(styles['timelineCard'] && { className: styles['timelineCard'] })}
      >
        <div
          ref={timelineRef}
          role='region'
          aria-label='Perjalanan Bisnis Timeline'
          className={styles['timelineContainer']}
        >
          <Timeline
            {...(styles['accessibleTimeline'] && {
              className: styles['accessibleTimeline'],
            })}
          >
            {filteredEvents.map((event, index) => (
              <TimelineItem key={event.id} index={index} style={{}} />
            ))}
          </Timeline>
        </div>

        {/* Summary footer */}
        {journeyData && (
          <div className={styles['timelineFooter']}>
            <Space split={<span>•</span>}>
              <span>Total: {filteredEvents.length} aktivitas</span>
              {userPermissions.canViewFinancials && (
                <span>Revenue: {formatIDR(journeyData.totalRevenue || 0)}</span>
              )}
              <span>
                Tingkat pembayaran: {journeyData.summary.completionRate || 0}%
              </span>
            </Space>
          </div>
        )}
      </Card>
    </div>
  )
}

export default BusinessJourneyTimeline
