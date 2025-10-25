import React, { useState, useRef } from 'react';
import { Card, Button, Space, Badge, Drawer, Swiper, Modal, message, Spin, Empty, Tag } from 'antd';
import { SwipeableList, SwipeableListItem } from '@react-swipeable-list';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  CameraOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import '@react-swipeable-list/css';

interface MilestoneData {
  id: string;
  milestoneNumber: number;
  name: string;
  nameId?: string;
  amount: number;
  dueDate: string;
  invoicedDate?: string;
  paidDate?: string;
  status: 'PENDING' | 'INVOICED' | 'PAID' | 'OVERDUE';
  deliverables?: string[];
  percentage?: number;
}

interface MobileMilestoneTrackerProps {
  quotationId: string;
  milestones: MilestoneData[];
  loading?: boolean;
  onGenerateInvoice?: (milestoneId: string) => Promise<void>;
  onMarkPaid?: (milestoneId: string) => Promise<void>;
  onDelete?: (milestoneId: string) => Promise<void>;
  onShare?: (milestoneId: string, platform: 'whatsapp' | 'email') => Promise<void>;
  onUploadProof?: (milestoneId: string, file: File) => Promise<void>;
}

const MobileMilestoneTracker: React.FC<MobileMilestoneTrackerProps> = ({
  quotationId,
  milestones,
  loading = false,
  onGenerateInvoice,
  onMarkPaid,
  onDelete,
  onShare,
  onUploadProof
}) => {
  const { t } = useTranslation();
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMilestoneId, setUploadingMilestoneId] = useState<string | null>(null);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'green';
      case 'INVOICED':
        return 'blue';
      case 'PENDING':
        return 'orange';
      case 'OVERDUE':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleOutlined className="text-green-600" />;
      case 'INVOICED':
        return <FileTextOutlined className="text-blue-600" />;
      case 'PENDING':
        return <ClockCircleOutlined className="text-orange-600" />;
      case 'OVERDUE':
        return <ExclamationCircleOutlined className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PAID':
        return t('status.paid');
      case 'INVOICED':
        return t('status.invoiced');
      case 'PENDING':
        return t('status.pending');
      case 'OVERDUE':
        return t('status.overdue');
      default:
        return status;
    }
  };

  const calculateDaysUntilDue = (dueDate: string): number | null => {
    const diff = dayjs(dueDate).diff(dayjs(), 'days');
    return diff;
  };

  const getDaysLabel = (milestone: MilestoneData): string => {
    const days = calculateDaysUntilDue(milestone.dueDate);
    if (days === null) return '';

    if (milestone.status === 'PAID') {
      const paidDays = dayjs(milestone.paidDate).diff(dayjs(milestone.dueDate), 'days');
      return paidDays <= 0 ? t('labels.onTime') : `${paidDays} ${t('labels.daysBehind')}`;
    }

    if (days < 0) {
      return `${Math.abs(days)} ${t('labels.daysOverdue')}`;
    } else if (days === 0) {
      return t('labels.dueToday');
    } else if (days === 1) {
      return t('labels.dueTomorrow');
    }
    return `${t('labels.dueIn')} ${days} ${t('labels.days')}`;
  };

  const handleGenerateInvoice = async (milestoneId: string) => {
    if (!onGenerateInvoice) return;

    try {
      await onGenerateInvoice(milestoneId);
      message.success(t('success.invoiceGenerated'));
    } catch (error) {
      message.error(t('error.failedToGenerateInvoice'));
    }
  };

  const handleMarkPaid = async (milestoneId: string) => {
    if (!onMarkPaid) return;

    try {
      await onMarkPaid(milestoneId);
      message.success(t('success.markedAsPaid'));
    } catch (error) {
      message.error(t('error.failedToMarkAsPaid'));
    }
  };

  const handleShare = async (milestone: MilestoneData, platform: 'whatsapp' | 'email') => {
    if (!onShare) return;

    try {
      await onShare(milestone.id, platform);
      message.success(t('success.shared'));
    } catch (error) {
      message.error(t('error.failedToShare'));
    }
  };

  const handleCameraUpload = async (milestoneId: string) => {
    cameraInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>, milestoneId: string) => {
    const file = event.target.files?.[0];
    if (!file || !onUploadProof) return;

    setUploadingMilestoneId(milestoneId);
    try {
      await onUploadProof(milestoneId, file);
      message.success(t('success.proofUploaded'));
    } catch (error) {
      message.error(t('error.failedToUploadProof'));
    } finally {
      setUploadingMilestoneId(null);
      event.target.value = '';
    }
  };

  const handleDeleteMilestone = (milestone: MilestoneData) => {
    Modal.confirm({
      title: t('confirmations.deleteTitle'),
      content: t('confirmations.deleteMilestoneContent'),
      okText: t('actions.delete'),
      cancelText: t('actions.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!onDelete) return;
        try {
          await onDelete(milestone.id);
          message.success(t('success.milestoneDeleted'));
        } catch (error) {
          message.error(t('error.failedToDelete'));
        }
      }
    });
  };

  if (loading) {
    return <Spin size="large" className="flex justify-center items-center h-96" />;
  }

  if (!milestones || milestones.length === 0) {
    return <Empty description={t('labels.noMilestones')} />;
  }

  const currentMilestone = milestones[currentIndex];
  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = milestones
    .filter(m => m.status === 'PAID')
    .reduce((sum, m) => sum + m.amount, 0);
  const progressPercentage = Math.round((paidAmount / totalAmount) * 100);

  return (
    <div className="mobile-milestone-tracker space-y-4 pb-6">
      {/* Progress Overview */}
      <Card className="shadow-md border-0">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            {progressPercentage}%
          </div>
          <p className="text-gray-600 mb-4">{t('labels.complete')}</p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Amount Summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-gray-500 text-sm">{t('labels.paid')}</p>
              <p className="font-semibold text-green-600">
                Rp {paidAmount.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="border-l border-r border-gray-300">
              <p className="text-gray-500 text-sm">{t('labels.total')}</p>
              <p className="font-semibold">
                Rp {totalAmount.toLocaleString('id-ID')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">{t('labels.remaining')}</p>
              <p className="font-semibold text-orange-600">
                Rp {(totalAmount - paidAmount).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestone Carousel/Swiper */}
      {milestones.length > 1 && (
        <Card className="shadow-md border-0">
          <div className="text-center mb-4 text-gray-600 text-sm">
            {currentIndex + 1} / {milestones.length}
          </div>

          <Swiper
            onSlideChange={(swiper) => setCurrentIndex(swiper.activeIndex)}
            pagination={{ clickable: true }}
            className="w-full"
          >
            {/* Swiper slides would be rendered here with actual Swiper component */}
          </Swiper>
        </Card>
      )}

      {/* Current/Main Milestone Card */}
      {currentMilestone && (
        <Card
          className="shadow-md border-0"
          actions={[
            <Button
              type="text"
              icon={<ArrowRightOutlined />}
              onClick={() => {
                setSelectedMilestone(currentMilestone);
                setDetailsOpen(true);
              }}
              block
            >
              {t('actions.details')}
            </Button>
          ]}
        >
          <div className="space-y-4">
            {/* Milestone Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(currentMilestone.status)}
                <div>
                  <h3 className="font-bold text-lg">
                    {currentMilestone.nameId || currentMilestone.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t('labels.milestone')} {currentMilestone.milestoneNumber}
                  </p>
                </div>
              </div>
              <Badge
                color={getStatusColor(currentMilestone.status)}
                text={getStatusLabel(currentMilestone.status)}
              />
            </div>

            {/* Amount */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-gray-600 text-sm mb-1">{t('labels.amount')}</p>
              <p className="text-2xl font-bold text-blue-600">
                Rp {currentMilestone.amount.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('labels.dueDate')}</span>
              <span className="font-semibold">
                {dayjs(currentMilestone.dueDate).format('DD/MM/YYYY')}
              </span>
            </div>

            {/* Days Until Due */}
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-gray-600 text-sm">{t('labels.timeline')}</p>
              <p className="text-lg font-semibold text-orange-600">
                {getDaysLabel(currentMilestone)}
              </p>
            </div>

            {/* Action Buttons */}
            <Space className="w-full" direction="vertical" style={{ width: '100%' }}>
              {currentMilestone.status === 'PENDING' && (
                <Button
                  type="primary"
                  block
                  onClick={() => handleGenerateInvoice(currentMilestone.id)}
                  icon={<FileTextOutlined />}
                  size="large"
                >
                  {t('actions.generateInvoice')}
                </Button>
              )}

              {currentMilestone.status === 'INVOICED' && (
                <Button
                  type="primary"
                  block
                  onClick={() => handleMarkPaid(currentMilestone.id)}
                  icon={<CheckCircleOutlined />}
                  size="large"
                >
                  {t('actions.markAsPaid')}
                </Button>
              )}

              {/* Share Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => handleShare(currentMilestone, 'whatsapp')}
                  block
                >
                  WhatsApp
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => handleShare(currentMilestone, 'email')}
                  block
                >
                  {t('labels.email')}
                </Button>
              </div>

              {/* Upload Proof & Download */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  icon={<CameraOutlined />}
                  onClick={() => handleCameraUpload(currentMilestone.id)}
                  loading={uploadingMilestoneId === currentMilestone.id}
                  block
                >
                  {t('actions.uploadProof')}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    // Download invoice or document
                    message.info(t('messages.downloadFeatureComingSoon'));
                  }}
                  block
                >
                  {t('actions.download')}
                </Button>
              </div>
            </Space>
          </div>
        </Card>
      )}

      {/* Swipeable List of All Milestones */}
      {milestones.length > 1 && (
        <Card title={t('labels.allMilestones')} className="shadow-md border-0">
          <SwipeableList>
            {milestones.map((milestone, idx) => (
              <SwipeableListItem
                key={milestone.id}
                onSwipeEnd={() => {
                  setSelectedMilestone(milestone);
                  setDetailsOpen(true);
                }}
                trailingActions={[
                  {
                    label: t('actions.delete'),
                    onClick: () => handleDeleteMilestone(milestone),
                    destructive: true
                  }
                ]}
              >
                <div
                  className="flex items-center justify-between p-3 border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setCurrentIndex(idx)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(milestone.status)}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">
                        {milestone.nameId || milestone.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Rp {milestone.amount.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <Tag color={getStatusColor(milestone.status)}>
                    {getStatusLabel(milestone.status)}
                  </Tag>
                </div>
              </SwipeableListItem>
            ))}
          </SwipeableList>
        </Card>
      )}

      {/* Details Drawer */}
      <Drawer
        title={`${selectedMilestone?.nameId || selectedMilestone?.name}`}
        placement="bottom"
        closable
        onClose={() => setDetailsOpen(false)}
        open={detailsOpen}
        height="80%"
      >
        {selectedMilestone && (
          <div className="space-y-4">
            <Card>
              <h4 className="font-bold mb-3">{t('labels.details')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('labels.amount')}</span>
                  <span className="font-semibold">
                    Rp {selectedMilestone.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">{t('labels.dueDate')}</span>
                  <span className="font-semibold">
                    {dayjs(selectedMilestone.dueDate).format('DD/MM/YYYY')}
                  </span>
                </div>
                {selectedMilestone.paidDate && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">{t('labels.paidDate')}</span>
                    <span className="font-semibold">
                      {dayjs(selectedMilestone.paidDate).format('DD/MM/YYYY')}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Deliverables */}
            {selectedMilestone.deliverables && selectedMilestone.deliverables.length > 0 && (
              <Card>
                <h4 className="font-bold mb-3">{t('labels.deliverables')}</h4>
                <ul className="space-y-2">
                  {selectedMilestone.deliverables.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircleOutlined className="text-green-600 mt-1" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* Hidden Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (currentMilestone) {
            handleFileSelected(e, currentMilestone.id);
          }
        }}
      />
    </div>
  );
};

export default MobileMilestoneTracker;
