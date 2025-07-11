import React, { useState } from 'react';
import { Button, List, message, Modal, Popconfirm, Select, Tag, Typography } from 'antd';
import { CheckOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { InvoiceStatus } from '../types/invoice';
import { invoiceService } from '../services/invoices';

const { Title, Text } = Typography;

interface BulkInvoiceStatusEditorProps {
  selectedInvoices: Array<{
    id: string;
    invoiceNumber: string;
    status: InvoiceStatus;
    totalAmount: string;
  }>;
  onStatusChange?: (invoiceIds: string[], newStatus: InvoiceStatus) => void;
  onCancel?: () => void;
}

export const BulkInvoiceStatusEditor: React.FC<BulkInvoiceStatusEditorProps> = ({
  selectedInvoices,
  onStatusChange,
  onCancel
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | undefined>();
  const [loading, setLoading] = useState(false);

  const showModal = () => {
    setIsVisible(true);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setSelectedStatus(undefined);
    if (onCancel) {
      onCancel();
    }
  };

  const getCommonTransitions = () => {
    if (selectedInvoices.length === 0) return [];

    // Find common available transitions for all selected invoices
    let commonTransitions = invoiceService.getAvailableStatusTransitions(selectedInvoices[0]?.status || InvoiceStatus.DRAFT);
    
    for (let i = 1; i < selectedInvoices.length; i++) {
      const currentTransitions = invoiceService.getAvailableStatusTransitions(selectedInvoices[i]?.status || InvoiceStatus.DRAFT);
      commonTransitions = commonTransitions.filter(transition => 
        currentTransitions.some(ct => ct.value === transition.value)
      );
    }

    return commonTransitions;
  };

  const handleBulkUpdate = async () => {
    if (!selectedStatus || selectedInvoices.length === 0) {
      message.error('Pilih status terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const invoiceIds = selectedInvoices.map(inv => inv.id);
      await invoiceService.bulkUpdateStatus(invoiceIds, selectedStatus);
      
      message.success(`Status ${selectedInvoices.length} invoice berhasil diubah ke ${invoiceService.getStatusLabel(selectedStatus)}`);
      
      if (onStatusChange) {
        onStatusChange(invoiceIds, selectedStatus);
      }
      
      handleCancel();
    } catch (error) {
      message.error(`Gagal mengubah status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return '📝';
      case InvoiceStatus.SENT:
        return '📤';
      case InvoiceStatus.PAID:
        return '✅';
      case InvoiceStatus.OVERDUE:
        return '⏰';
      case InvoiceStatus.CANCELLED:
        return '❌';
      default:
        return '📄';
    }
  };

  const commonTransitions = getCommonTransitions();
  const canBulkUpdate = commonTransitions.length > 0;

  const getConfirmContent = () => {
    if (!selectedStatus) return null;

    const statusLabel = invoiceService.getStatusLabel(selectedStatus);
    const totalAmount = selectedInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);

    return (
      <div>
        <div className="mb-4">
          <Text strong>Mengubah status {selectedInvoices.length} invoice ke: </Text>
          <Tag color="blue" className="ml-2">
            {getStatusIcon(selectedStatus)} {statusLabel}
          </Tag>
        </div>
        
        <div className="mb-4">
          <Text>Total nilai invoice: </Text>
          <Text strong>{invoiceService.formatAmount(totalAmount)}</Text>
        </div>

        <div className="bg-gray-50 p-3 rounded mb-4">
          <Text strong className="block mb-2">Invoice yang akan diubah:</Text>
          <List
            size="small"
            dataSource={selectedInvoices}
            renderItem={invoice => (
              <List.Item key={invoice.id} className="px-0">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <Text>{invoice.invoiceNumber}</Text>
                    <Tag className="ml-2">
                      {invoiceService.getStatusLabel(invoice.status)}
                    </Tag>
                  </div>
                  <Text>{invoiceService.formatAmount(invoice.totalAmount)}</Text>
                </div>
              </List.Item>
            )}
          />
        </div>

        {selectedStatus === InvoiceStatus.CANCELLED && (
          <div className="bg-red-50 p-3 rounded mb-4">
            <ExclamationCircleOutlined className="text-red-500 mr-2" />
            <Text type="danger">Tindakan ini tidak dapat dibatalkan. Invoice yang dibatalkan tidak dapat diubah lagi.</Text>
          </div>
        )}

        {selectedStatus === InvoiceStatus.PAID && (
          <div className="bg-green-50 p-3 rounded mb-4">
            <CheckOutlined className="text-green-500 mr-2" />
            <Text type="success">Pastikan pembayaran sudah diterima sebelum menandai sebagai lunas.</Text>
          </div>
        )}
      </div>
    );
  };

  const renderBulkUpdateButton = () => {
    if (selectedStatus === InvoiceStatus.CANCELLED) {
      return (
        <Popconfirm
          title="Batalkan Invoice?"
          description={getConfirmContent()}
          onConfirm={handleBulkUpdate}
          okText="Ya, Batalkan Semua"
          cancelText="Tidak"
          okType="danger"
          overlayStyle={{ maxWidth: 400 }}
        >
          <Button type="primary" danger loading={loading}>
            Batalkan {selectedInvoices.length} Invoice
          </Button>
        </Popconfirm>
      );
    }

    if (selectedStatus === InvoiceStatus.PAID) {
      return (
        <Popconfirm
          title="Tandai Sebagai Lunas?"
          description={getConfirmContent()}
          onConfirm={handleBulkUpdate}
          okText="Ya, Semua Sudah Lunas"
          cancelText="Belum"
          okType="primary"
          overlayStyle={{ maxWidth: 400 }}
        >
          <Button type="primary" loading={loading}>
            Tandai {selectedInvoices.length} Invoice Lunas
          </Button>
        </Popconfirm>
      );
    }

    return (
      <Button type="primary" loading={loading} onClick={handleBulkUpdate}>
        Ubah Status {selectedInvoices.length} Invoice
      </Button>
    );
  };

  if (selectedInvoices.length === 0) {
    return null;
  }

  return (
    <>
      <Button 
        icon={<EditOutlined />}
        onClick={showModal}
        disabled={!canBulkUpdate}
        title={canBulkUpdate ? 'Ubah status beberapa invoice sekaligus' : 'Tidak ada status yang dapat diubah untuk semua invoice yang dipilih'}
      >
        Ubah Status ({selectedInvoices.length})
      </Button>

      <Modal
        title="Ubah Status Invoice (Bulk)"
        open={isVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel} disabled={loading}>
            Batal
          </Button>,
          selectedStatus && renderBulkUpdateButton(),
        ]}
        width={600}
      >
        <div className="space-y-4">
          <div>
            <Title level={5}>Pilih Status Baru</Title>
            <Text type="secondary">
              Hanya status yang dapat diubah untuk semua invoice yang dipilih yang akan ditampilkan.
            </Text>
          </div>

          <div>
            <Select
              value={selectedStatus}
              onChange={setSelectedStatus}
              placeholder="Pilih status baru"
              style={{ width: '100%' }}
              size="large"
            >
              {commonTransitions.map(transition => (
                <Select.Option key={transition.value} value={transition.value}>
                  <span className="mr-2">{getStatusIcon(transition.value)}</span>
                  {transition.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Title level={5}>Invoice yang Dipilih</Title>
            <div className="bg-gray-50 p-4 rounded max-h-60 overflow-y-auto">
              <List
                dataSource={selectedInvoices}
                renderItem={invoice => (
                  <List.Item key={invoice.id} className="px-0">
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <Text strong>{invoice.invoiceNumber}</Text>
                        <Tag className="ml-2" color={invoiceService.getStatusColor(invoice.status)}>
                          {invoiceService.getStatusLabel(invoice.status)}
                        </Tag>
                      </div>
                      <Text>{invoiceService.formatAmount(invoice.totalAmount)}</Text>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </div>

          {!canBulkUpdate && (
            <div className="bg-yellow-50 p-3 rounded">
              <ExclamationCircleOutlined className="text-yellow-500 mr-2" />
              <Text type="warning">
                Invoice yang dipilih memiliki status yang berbeda-beda. Tidak ada perubahan status yang dapat diterapkan untuk semua invoice sekaligus.
              </Text>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default BulkInvoiceStatusEditor;
