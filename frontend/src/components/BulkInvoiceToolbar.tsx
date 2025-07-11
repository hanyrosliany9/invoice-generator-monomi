import React from 'react';
import { Button, Card, Space, Typography, Tag, Tooltip, Divider } from 'antd';
import { 
  SendOutlined, 
  CheckCircleOutlined, 
  PrinterOutlined, 
  DeleteOutlined,
  CloseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from '../types/invoice';
import { BulkInvoiceStatusEditor } from './BulkInvoiceStatusEditor';

const { Text } = Typography;

interface BulkInvoiceToolbarProps {
  selectedInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    totalAmount: string;
    clientName?: string;
  }>;
  onBulkSend: () => void;
  onBulkMarkPaid: () => void;
  onBulkPrint: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (ids: string[], newStatus: InvoiceStatus) => void;
  onClearSelection: () => void;
  loading: boolean;
}

export const BulkInvoiceToolbar: React.FC<BulkInvoiceToolbarProps> = ({
  selectedInvoices,
  onBulkSend,
  onBulkMarkPaid,
  onBulkPrint,
  onBulkDelete,
  onBulkStatusChange,
  onClearSelection,
  loading
}) => {
  const getStatusCounts = () => {
    const counts = {
      DRAFT: 0,
      SENT: 0,
      PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0
    };

    selectedInvoices.forEach(invoice => {
      counts[invoice.status]++;
    });

    return counts;
  };

  const getTotalAmount = () => {
    return selectedInvoices.reduce((sum, invoice) => 
      sum + parseFloat(invoice.totalAmount.toString()), 0
    );
  };

  const canBulkSend = () => {
    return selectedInvoices.some(invoice => invoice.status === InvoiceStatus.DRAFT);
  };

  const canBulkMarkPaid = () => {
    return selectedInvoices.some(invoice => 
      invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE
    );
  };

  const canBulkDelete = () => {
    return selectedInvoices.some(invoice => 
      invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED
    );
  };

  const statusCounts = getStatusCounts();
  const totalAmount = getTotalAmount();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50" size="small">
      <div className="flex flex-col space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Text strong className="text-blue-700">
              {selectedInvoices.length} invoice dipilih
            </Text>
            <Divider type="vertical" />
            <Text className="text-gray-600">
              Total: {formatCurrency(totalAmount)}
            </Text>
          </div>
          <Button 
            size="small" 
            icon={<CloseOutlined />}
            onClick={onClearSelection}
            type="text"
            className="text-gray-500 hover:text-gray-700"
          >
            Batal
          </Button>
        </div>

        {/* Status breakdown */}
        <div className="flex items-center space-x-2">
          <InfoCircleOutlined className="text-blue-500" />
          <Text className="text-sm text-gray-600">Status:</Text>
          <Space size="small">
            {statusCounts.DRAFT > 0 && (
              <Tag color="default">{statusCounts.DRAFT} Draft</Tag>
            )}
            {statusCounts.SENT > 0 && (
              <Tag color="blue">{statusCounts.SENT} Terkirim</Tag>
            )}
            {statusCounts.PAID > 0 && (
              <Tag color="green">{statusCounts.PAID} Lunas</Tag>
            )}
            {statusCounts.OVERDUE > 0 && (
              <Tag color="red">{statusCounts.OVERDUE} Jatuh Tempo</Tag>
            )}
            {statusCounts.CANCELLED > 0 && (
              <Tag color="default">{statusCounts.CANCELLED} Dibatalkan</Tag>
            )}
          </Space>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Space size="small">
            <Tooltip title={canBulkSend() ? `Kirim ${statusCounts.DRAFT} invoice draft` : 'Tidak ada invoice draft yang dipilih'}>
              <Button 
                size="small"
                icon={<SendOutlined />}
                loading={loading}
                onClick={onBulkSend}
                disabled={!canBulkSend()}
                type={canBulkSend() ? 'primary' : 'default'}
              >
                Kirim {statusCounts.DRAFT > 0 && `(${statusCounts.DRAFT})`}
              </Button>
            </Tooltip>

            <Tooltip title={canBulkMarkPaid() ? `Tandai ${statusCounts.SENT + statusCounts.OVERDUE} invoice sebagai lunas` : 'Tidak ada invoice terkirim yang dipilih'}>
              <Button 
                size="small"
                icon={<CheckCircleOutlined />}
                loading={loading}
                onClick={onBulkMarkPaid}
                disabled={!canBulkMarkPaid()}
                type={canBulkMarkPaid() ? 'primary' : 'default'}
              >
                Tandai Lunas {(statusCounts.SENT + statusCounts.OVERDUE) > 0 && `(${statusCounts.SENT + statusCounts.OVERDUE})`}
              </Button>
            </Tooltip>

            <Button 
              size="small"
              icon={<PrinterOutlined />}
              loading={loading}
              onClick={onBulkPrint}
            >
              Print
            </Button>

            <BulkInvoiceStatusEditor
              selectedInvoices={selectedInvoices}
              onStatusChange={onBulkStatusChange}
            />
          </Space>

          <Space size="small">
            <Tooltip title={canBulkDelete() ? 'Hapus invoice yang dipilih' : 'Hanya invoice draft dan dibatalkan yang dapat dihapus'}>
              <Button 
                size="small"
                icon={<DeleteOutlined />}
                danger
                loading={loading}
                onClick={onBulkDelete}
                disabled={!canBulkDelete()}
              >
                Hapus {(statusCounts.DRAFT + statusCounts.CANCELLED) > 0 && `(${statusCounts.DRAFT + statusCounts.CANCELLED})`}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default BulkInvoiceToolbar;