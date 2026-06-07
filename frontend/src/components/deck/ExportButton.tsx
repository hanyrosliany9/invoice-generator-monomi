import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import {
  ExportOutlined,
  FilePdfOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import {
  startPdfExport,
  exportSlideAsPng,
  ExportQuality,
} from '../../services/exportApi';
import ExportProgressModal from './ExportProgressModal';

interface ExportButtonProps {
  deckId: string;
  currentSlideIndex: number;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  deckId,
  currentSlideIndex,
  disabled,
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleExportPdf = useCallback(
    async (quality: ExportQuality) => {
      try {
        setExporting(true);
        const result = await startPdfExport(deckId, quality);
        setJobId(result.jobId);
        setShowProgress(true);
      } catch (err) {
        console.error('Failed to start export:', err);
        message.error(t('deckEditor.exportPdfStartError', 'Failed to start PDF export'));
      } finally {
        setExporting(false);
      }
    },
    [deckId]
  );

  const handleExportCurrentSlide = useCallback(async () => {
    try {
      setExporting(true);
      const blob = await exportSlideAsPng(deckId, currentSlideIndex, 2);

      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `slide-${currentSlideIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(t('deckEditor.slideExported', 'Slide exported successfully'));
    } catch (err) {
      console.error('Failed to export slide:', err);
      message.error(t('deckEditor.slideExportError', 'Failed to export slide'));
    } finally {
      setExporting(false);
    }
  }, [deckId, currentSlideIndex]);

  const handleCloseProgress = useCallback(() => {
    setShowProgress(false);
    setJobId(null);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: 'pdf-group',
      type: 'group',
      label: t('deckEditor.exportAsPdf', 'Export as PDF'),
      children: [
        {
          key: 'pdf-draft',
          icon: <FilePdfOutlined />,
          label: t('deckEditor.exportDraftQuality', 'Draft Quality (Fast)'),
          onClick: () => handleExportPdf('draft'),
        },
        {
          key: 'pdf-standard',
          icon: <FilePdfOutlined />,
          label: t('deckEditor.exportStandardQuality', 'Standard Quality'),
          onClick: () => handleExportPdf('standard'),
        },
        {
          key: 'pdf-high',
          icon: <FilePdfOutlined />,
          label: t('deckEditor.exportHighQuality', 'High Quality (Slow)'),
          onClick: () => handleExportPdf('high'),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'png',
      icon: <FileImageOutlined />,
      label: t('deckEditor.exportCurrentSlidePng', 'Export Current Slide as PNG'),
      onClick: handleExportCurrentSlide,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={disabled || exporting}
      >
        <Button icon={<ExportOutlined />} loading={exporting}>
          {t('deckEditor.export', 'Export')}
        </Button>
      </Dropdown>

      <ExportProgressModal
        open={showProgress}
        onClose={handleCloseProgress}
        deckId={deckId}
        jobId={jobId}
      />
    </>
  );
};

export default ExportButton;
