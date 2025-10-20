import React, { useState } from 'react';
import { Button, Dropdown, Menu, message } from 'antd';
import type { MenuProps } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';

interface ExportButtonProps {
  onExportPDF: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  pdfLabel?: string;
  excelLabel?: string;
  buttonText?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportPDF,
  onExportExcel,
  pdfLabel = 'Export PDF',
  excelLabel = 'Export Excel',
  buttonText = 'Export',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await onExportPDF();
      } else {
        await onExportExcel();
      }
      message.success(`${type.toUpperCase()} exported successfully!`);
    } catch (error) {
      console.error(`Export ${type} error:`, error);
      message.error(`Failed to export ${type.toUpperCase()}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: pdfLabel,
      onClick: () => handleExport('pdf'),
    },
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: excelLabel,
      onClick: () => handleExport('excel'),
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button icon={<DownloadOutlined />} loading={isExporting}>
        {buttonText}
      </Button>
    </Dropdown>
  );
};
