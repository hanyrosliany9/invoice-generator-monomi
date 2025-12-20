import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  FileTextOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTheme } from '../../theme';
import { useIsMobile } from '../../hooks/useMediaQuery';
import JournalLineItemsEditor, {
  JournalLineItemFormData,
} from '../../components/accounting/JournalLineItemsEditor';
import {
  createJournalEntry,
  getCurrentFiscalPeriod,
  getJournalEntry,
  JournalEntry,
  updateJournalEntry,
} from '../../services/accounting';
import { getErrorMessage } from '../../utils/errorHandling';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const JournalEntryFormPage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [lineItems, setLineItems] = useState<JournalLineItemFormData[]>([
    { id: `line-${Date.now()}-1`, accountCode: '', debit: 0, credit: 0, descriptionId: '' },
    { id: `line-${Date.now()}-2`, accountCode: '', debit: 0, credit: 0, descriptionId: '' },
  ]);

  const isEditMode = !!id;

  // Check if we have prefilled data from wizard
  const prefilledData = (location.state as any)?.prefilled;

  // Load existing entry if editing
  const { data: existingEntry, isLoading: loadingEntry } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn: () => getJournalEntry(id!),
    enabled: isEditMode,
  });

  // Load current fiscal period
  const { data: fiscalPeriod } = useQuery({
    queryKey: ['current-fiscal-period'],
    queryFn: getCurrentFiscalPeriod,
  });

  // Populate form with existing entry data or prefilled wizard data
  useEffect(() => {
    if (existingEntry) {
      // Check if entry can be edited
      if (existingEntry.isPosted) {
        message.error('Jurnal yang sudah diposting tidak dapat diedit');
        navigate('/accounting/journal-entries');
        return;
      }

      form.setFieldsValue({
        entryDate: dayjs(existingEntry.entryDate),
        transactionType: existingEntry.transactionType,
        description: existingEntry.description,
        descriptionId: existingEntry.descriptionId,
        documentNumber: existingEntry.documentNumber,
        documentDate: existingEntry.documentDate ? dayjs(existingEntry.documentDate) : undefined,
      });

      // Populate line items
      const items: JournalLineItemFormData[] = existingEntry.lineItems.map((item) => ({
        id: item.id,
        accountCode: item.accountCode,
        descriptionId: item.descriptionId || '',
        debit: item.debitAmount,
        credit: item.creditAmount,
      }));
      setLineItems(items);
    } else if (prefilledData) {
      // Populate from wizard prefilled data
      form.setFieldsValue({
        entryDate: prefilledData.entryDate,
        transactionType: prefilledData.transactionType,
        description: prefilledData.description,
        descriptionId: prefilledData.descriptionId,
        documentNumber: prefilledData.documentNumber,
        documentDate: prefilledData.documentDate,
      });

      if (prefilledData.lineItems) {
        setLineItems(prefilledData.lineItems);
      }

      // Show success message from wizard
      message.success('Data dari wizard telah diisi. Periksa dan edit jika perlu.');
    }
  }, [existingEntry, prefilledData, form, navigate]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      message.success('Jurnal entry berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      navigate('/accounting/journal-entries');
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal membuat jurnal entry'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JournalEntry> }) =>
      updateJournalEntry(id, data),
    onSuccess: () => {
      message.success('Jurnal entry berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', id] });
      navigate('/accounting/journal-entries');
    },
    onError: (error) => {
      message.error(getErrorMessage(error, 'Gagal memperbarui jurnal entry'));
    },
  });

  const handleSubmit = async () => {
    try {
      await form.validateFields();

      // Validate line items
      if (lineItems.length < 2) {
        message.error('Minimal 2 item baris diperlukan');
        return;
      }

      // Validate all line items have account codes
      const hasEmptyAccounts = lineItems.some((item) => !item.accountCode);
      if (hasEmptyAccounts) {
        message.error('Semua baris harus memiliki kode akun');
        return;
      }

      // Validate each line has either debit OR credit
      const invalidLines = lineItems.filter(
        (item) => (item.debit === 0 && item.credit === 0) || (item.debit > 0 && item.credit > 0)
      );
      if (invalidLines.length > 0) {
        message.error('Setiap baris harus memiliki debit ATAU kredit (bukan keduanya atau tidak sama sekali)');
        return;
      }

      // Validate balanced entry
      const totalDebit = lineItems.reduce((sum, item) => sum + Number(item.debit || 0), 0);
      const totalCredit = lineItems.reduce((sum, item) => sum + Number(item.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) >= 0.01) {
        message.error('Total debit harus sama dengan total kredit');
        return;
      }

      const values = form.getFieldsValue();

      const journalData = {
        entryDate: values.entryDate.toISOString(),
        description: values.description || values.descriptionId, // Fallback to descriptionId if description is empty
        descriptionId: values.descriptionId || values.description,
        transactionType: values.transactionType,
        transactionId: id || 'MANUAL-' + Date.now(), // Use unique ID for manual entries
        documentNumber: values.documentNumber,
        documentDate: values.documentDate?.toISOString(),
        fiscalPeriodId: fiscalPeriod?.id,
        lineItems: lineItems.map((item) => ({
          accountCode: item.accountCode,
          description: item.descriptionId || values.descriptionId || values.description,
          descriptionId: item.descriptionId,
          debitAmount: Number(item.debit) || 0,
          creditAmount: Number(item.credit) || 0,
        })),
      };

      if (isEditMode) {
        updateMutation.mutate({ id, data: journalData });
      } else {
        createMutation.mutate(journalData);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    navigate('/accounting/journal-entries');
  };

  const transactionTypeOptions = [
    { value: 'ADJUSTMENT', label: 'Penyesuaian (Adjustment)' },
    { value: 'CASH_RECEIPT', label: 'Penerimaan Kas (Cash Receipt)' },
    { value: 'CASH_DISBURSEMENT', label: 'Pengeluaran Kas (Cash Disbursement)' },
    { value: 'DEPRECIATION', label: 'Penyusutan (Depreciation)' },
    { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
    { value: 'CAPITAL_CONTRIBUTION', label: 'Setoran Modal' },
    { value: 'OWNER_DRAWING', label: 'Penarikan Pemilik' },
    { value: 'CLOSING', label: 'Penutupan Period' },
    { value: 'OPENING', label: 'Pembukaan Period' },
  ];

  if (loadingEntry) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          style={{ marginBottom: '8px' }}
        >
          Kembali
        </Button>
        <Title level={2} style={{ margin: 0, color: theme.colors.text.primary }}>
          <FileTextOutlined />{' '}
          {isEditMode ? 'Edit Jurnal Entry' : 'Buat Jurnal Entry Manual'}
        </Title>
        <Text type="secondary">
          {isEditMode
            ? 'Edit jurnal entry yang masih dalam status draft'
            : 'Buat jurnal entry manual untuk penyesuaian atau transaksi lainnya'}
        </Text>
      </div>

      {/* Fiscal Period Info */}
      {fiscalPeriod && (
        <Alert
          message={`Periode Fiskal: ${fiscalPeriod.name}`}
          description={`${dayjs(fiscalPeriod.startDate).format('DD MMM YYYY')} - ${dayjs(fiscalPeriod.endDate).format('DD MMM YYYY')} (${fiscalPeriod.status})`}
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      <Form form={form} layout="vertical">
        <Card
          title="Informasi Jurnal"
          style={{
            marginBottom: '24px',
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Form.Item
            label="Tanggal Entry"
            name="entryDate"
            rules={[{ required: true, message: 'Tanggal entry harus diisi' }]}
            initialValue={dayjs()}
          >
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              placeholder="Pilih tanggal"
            />
          </Form.Item>

          <Form.Item
            label="Tipe Transaksi"
            name="transactionType"
            rules={[{ required: true, message: 'Tipe transaksi harus dipilih' }]}
            initialValue="ADJUSTMENT"
          >
            <Select placeholder="Pilih tipe transaksi">
              {transactionTypeOptions.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Deskripsi (Bahasa Indonesia)"
            name="descriptionId"
            rules={[
              { required: true, message: 'Deskripsi harus diisi' },
              { min: 10, message: 'Deskripsi minimal 10 karakter' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder="Masukkan deskripsi lengkap jurnal entry (minimal 10 karakter)"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item label="Deskripsi (English - Opsional)" name="description">
            <TextArea
              rows={2}
              placeholder="Enter English description (optional)"
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item label="Nomor Dokumen (Opsional)" name="documentNumber">
            <Input placeholder="Contoh: INV-2025-001" />
          </Form.Item>

          <Form.Item label="Tanggal Dokumen (Opsional)" name="documentDate">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Card>

        <Card
          title="Item Baris (Line Items)"
          style={{
            marginBottom: '24px',
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <JournalLineItemsEditor value={lineItems} onChange={setLineItems} />
        </Card>

        {/* Actions */}
        <Card
          style={{
            background: theme.colors.card.background,
            borderColor: theme.colors.border.default,
          }}
        >
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              size="large"
            >
              {isEditMode ? 'Perbarui Draft' : 'Simpan sebagai Draft'}
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancel} size="large">
              Batal
            </Button>
          </Space>
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              * Jurnal entry akan disimpan sebagai draft. Anda dapat memposting ke buku besar
              setelah memeriksa kembali.
            </Text>
          </div>
        </Card>
      </Form>
    </div>
  );
};

export default JournalEntryFormPage;
