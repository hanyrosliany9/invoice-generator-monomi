import { Button, App } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { apiClient } from '../../config/api';

interface Props {
  shotListId: string;
  shotListName: string;
}

export default function ExportPdfButton({ shotListId, shotListName }: Props) {
  const { message } = App.useApp();

  const handleExport = async () => {
    try {
      const hideMessage = message.loading('Generating PDF...', 0);

      const response = await apiClient.get(`/shot-lists/${shotListId}/export/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${shotListName.replace(/\s+/g, '_')}_shot_list.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      hideMessage();
      message.success('PDF exported successfully');
    } catch (error) {
      message.error('Failed to export PDF');
    }
  };

  return (
    <Button
      icon={<FilePdfOutlined />}
      onClick={handleExport}
      type="primary"
    >
      Export PDF
    </Button>
  );
}
