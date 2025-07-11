import React from 'react';
import { Button, Dropdown, Space, Tooltip, App } from 'antd';
import { 
  SendOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  EyeOutlined,
  EditOutlined,
  PrinterOutlined,
  MoreOutlined,
  LinkOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { InvoiceStatus } from '../types/invoice';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  quotationId?: string;
  clientName?: string;
  totalAmount: string | number;
  dueDate: string;
  isOverdue?: boolean;
  materaiRequired?: boolean;
  materaiApplied?: boolean;
}

interface InvoiceActionsProps {
  invoice: Invoice;
  onSend: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onViewQuotation?: () => void;
  compact?: boolean;
}

export const InvoiceActions: React.FC<InvoiceActionsProps> = ({
  invoice,
  onSend,
  onMarkPaid,
  onView,
  onEdit,
  onPrint,
  onDelete,
  onViewQuotation,
  compact = false
}) => {
  const { modal } = App.useApp();

  const handleDeleteWithConfirmation = () => {
    modal.confirm({
      title: 'Hapus Invoice',
      content: (
        <div>
          <p>Apakah Anda yakin ingin menghapus invoice <strong>{invoice.invoiceNumber}</strong>?</p>
          <p className="text-red-600 text-sm mt-2">
            <ExclamationCircleOutlined className="mr-1" />
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      ),
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okType: 'danger',
      onOk: () => onDelete(invoice.id)
    });
  };

  const handleSendWithConfirmation = () => {
    modal.confirm({
      title: 'Kirim Invoice',
      content: `Apakah Anda yakin ingin mengirim invoice ${invoice.invoiceNumber} ke ${invoice.clientName}?`,
      okText: 'Ya, Kirim',
      cancelText: 'Batal',
      onOk: () => onSend(invoice)
    });
  };

  const handleMarkPaidWithConfirmation = () => {
    modal.confirm({
      title: 'Tandai Sebagai Lunas',
      content: (
        <div>
          <p>Tandai invoice <strong>{invoice.invoiceNumber}</strong> sebagai lunas?</p>
          <p className="text-green-600 text-sm mt-2">
            <CheckCircleOutlined className="mr-1" />
            Pastikan pembayaran sudah diterima sebelum menandai sebagai lunas.
          </p>
        </div>
      ),
      okText: 'Ya, Sudah Lunas',
      cancelText: 'Belum',
      okType: 'primary',
      onOk: () => onMarkPaid(invoice)
    });
  };

  const getPrimaryAction = () => {
    switch (invoice.status) {
      case InvoiceStatus.DRAFT:
        return (
          <Tooltip title="Kirim invoice ke klien">
            <Button 
              type="primary" 
              size="small" 
              icon={<SendOutlined />}
              onClick={handleSendWithConfirmation}
            >
              {!compact && 'Kirim'}
            </Button>
          </Tooltip>
        );
      
      case InvoiceStatus.SENT:
        return (
          <Tooltip title="Tandai invoice sebagai lunas">
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={handleMarkPaidWithConfirmation}
            >
              {!compact && 'Lunas'}
            </Button>
          </Tooltip>
        );
      
      case InvoiceStatus.OVERDUE:
        return (
          <Tooltip title="Tindak lanjut invoice jatuh tempo">
            <Button 
              type="primary" 
              danger 
              size="small" 
              icon={<ClockCircleOutlined />}
              onClick={handleMarkPaidWithConfirmation}
            >
              {!compact && 'Tindak Lanjut'}
            </Button>
          </Tooltip>
        );
      
      case InvoiceStatus.PAID:
        return (
          <Tooltip title="Lihat detail invoice">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => onView(invoice)}
            >
              {!compact && 'Lihat'}
            </Button>
          </Tooltip>
        );
      
      default:
        return null;
    }
  };

  const getSecondaryActions = () => {
    const actions = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => onView(invoice)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => onEdit(invoice),
        disabled: invoice.status === InvoiceStatus.PAID
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print',
        onClick: () => onPrint(invoice)
      }
    ];

    // Add quotation link if exists
    if (invoice.quotationId && onViewQuotation) {
      actions.splice(1, 0, {
        key: 'view-quotation',
        icon: <LinkOutlined />,
        label: 'Lihat Quotation',
        onClick: onViewQuotation
      });
    }

    // Add status-specific actions
    if (invoice.status === InvoiceStatus.DRAFT) {
      actions.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Kirim',
        onClick: handleSendWithConfirmation
      });
    }

    if (invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE) {
      actions.push({
        key: 'mark-paid',
        icon: <CheckCircleOutlined />,
        label: 'Tandai Lunas',
        onClick: handleMarkPaidWithConfirmation
      });
    }

    // Add delete action (only for drafts or cancelled)
    if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) {
      actions.push({
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        onClick: handleDeleteWithConfirmation
      });
    }

    return actions;
  };

  if (compact) {
    return (
      <Space size="small">
        {getPrimaryAction()}
        <Dropdown
          menu={{ items: getSecondaryActions() }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button size="small" icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
    );
  }

  return (
    <Space size="small">
      {getPrimaryAction()}
      <Dropdown
        menu={{ items: getSecondaryActions() }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  );
};

export default InvoiceActions;