import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportBalanceSheetExcel, exportBalanceSheetPDF, getBalanceSheet } from '../../services/accounting';
import { useTheme } from '../../theme';
import { ExportButton } from '../../components/accounting/ExportButton';
import { useIsMobile } from '../../hooks/useMediaQuery';
import MobileTableView from '../../components/mobile/MobileTableView';
import type { MobileTableAction } from '../../components/mobile/MobileTableView';
import { balanceSheetAccountToBusinessEntity } from '../../adapters/mobileTableAdapters';

const { Title, Text } = Typography;

const BalanceSheetPage: React.FC = () => {
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [asOfDate, setAsOfDate] = useState<dayjs.Dayjs>(dayjs());

  const { data, isLoading } = useQuery({
    queryKey: ['balance-sheet', asOfDate?.format('YYYY-MM-DD')],
    queryFn: () =>
      getBalanceSheet({
        endDate: asOfDate.format('YYYY-MM-DD'),
      }),
    enabled: !!asOfDate,
  });

  const handleExportPDF = async () => {
    await exportBalanceSheetPDF({
      endDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const handleExportExcel = async () => {
    await exportBalanceSheetExcel({
      endDate: asOfDate.format('YYYY-MM-DD'),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Mobile view data
  const assetsData = useMemo(() =>
    (data?.assets.accounts || []).map((acc: any) => balanceSheetAccountToBusinessEntity(acc, 'asset')),
    [data?.assets.accounts]
  );

  const liabilitiesData = useMemo(() =>
    (data?.liabilities.accounts || []).map((acc: any) => balanceSheetAccountToBusinessEntity(acc, 'liability')),
    [data?.liabilities.accounts]
  );

  const equityData = useMemo(() =>
    (data?.equity.accounts || []).map((acc: any) => balanceSheetAccountToBusinessEntity(acc, 'equity')),
    [data?.equity.accounts]
  );

  const mobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail Akun',
      icon: <BankOutlined />,
      onClick: (record) => {
        console.log('View account:', record.number);
      },
    },
  ], []);

  const accountColumns = [
    {
      title: 'Kode Akun',
      dataIndex: 'accountCode',
      key: 'accountCode',
      width: 120,
    },
    {
      title: 'Nama Akun',
      dataIndex: 'accountNameId',
      key: 'accountNameId',
      render: (nameId: string, record: any) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {nameId}
            {record.isContraAccount && (
              <Text type="secondary" style={{ fontSize: '11px', marginLeft: '8px' }}>
                (Kontra)
              </Text>
            )}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.accountName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Saldo',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right' as const,
      width: 180,
      render: (balance: number, record: any) => (
        <Text
          strong
          style={{
            color: record.isContraAccount && balance < 0
              ? theme.colors.status.error
              : theme.colors.text.primary
          }}
        >
          {formatCurrency(balance)}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px' : '24px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: isMobile ? '16px' : '24px',
          gap: isMobile ? '12px' : '0',
        }}
      >
        <div>
          <Title level={isMobile ? 3 : 2} style={{ margin: 0, color: theme.colors.text.primary}}>
            {isMobile ? 'Neraca' : 'Neraca (Balance Sheet)'}
          </Title>
          <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
            {isMobile ? 'Laporan posisi keuangan' : 'Laporan posisi keuangan perusahaan'}
          </Text>
        </div>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
          <DatePicker
            value={asOfDate}
            onChange={(date) => {
              if (date) {
                setAsOfDate(date);
              }
            }}
            format="DD/MM/YYYY"
            placeholder={isMobile ? 'Tanggal' : 'Pilih Tanggal'}
            size={isMobile ? 'small' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          />
          <ExportButton
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
          />
        </Space>
      </div>

      {/* Date Info */}
      <Card
        size={isMobile ? 'small' : 'default'}
        style={{
          marginBottom: isMobile ? '16px' : '24px',
          background: theme.colors.accent.primary,
          borderColor: theme.colors.accent.primary,
        }}
      >
        <Space align="center" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <CalendarOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#fff' }} />
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <Text style={{ color: '#fff', fontSize: isMobile ? '13px' : '16px', fontWeight: 500 }}>
              Per Tanggal: {asOfDate.format(isMobile ? 'DD MMM YYYY' : 'DD MMMM YYYY')}
            </Text>
          </div>
        </Space>
      </Card>

      {isLoading ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </Card>
      ) : !data ? (
        <Card>
          <Empty description="Tidak ada data untuk tanggal ini" />
        </Card>
      ) : (
        <>
          {/* Balance Check */}
          {data.summary.isBalanced ? (
            <Alert
              message={isMobile ? 'Seimbang' : 'Neraca Seimbang'}
              description={
                isMobile
                  ? `Aset = Kewajiban + Ekuitas`
                  : `Aset = Kewajiban + Ekuitas (${formatCurrency(data.summary.totalAssets)} = ${formatCurrency(data.summary.liabilitiesAndEquity)})`
              }
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: isMobile ? '16px' : '24px', fontSize: isMobile ? '12px' : '14px' }}
            />
          ) : (
            <Alert
              message={isMobile ? 'Tidak Seimbang' : 'Neraca Tidak Seimbang'}
              description={`Selisih: ${formatCurrency(data.summary.difference)}`}
              type="error"
              showIcon
              icon={<CloseCircleOutlined />}
              style={{ marginBottom: isMobile ? '16px' : '24px', fontSize: isMobile ? '12px' : '14px' }}
            />
          )}

          {/* Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? 'repeat(auto-fit, minmax(140px, 1fr))'
                : 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: isMobile ? '8px' : '16px',
              marginBottom: isMobile ? '16px' : '24px',
            }}
          >
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <BankOutlined style={{ color: theme.colors.status.success }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>
                      {isMobile ? 'Aset' : 'Total Aset'}
                    </span>
                  </Space>
                }
                value={data.summary.totalAssets}
                precision={0}
                valueStyle={{ color: theme.colors.status.success, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <DollarOutlined style={{ color: theme.colors.status.error }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>
                      {isMobile ? 'Kewajiban' : 'Total Kewajiban'}
                    </span>
                  </Space>
                }
                value={data.summary.totalLiabilities}
                precision={0}
                valueStyle={{ color: theme.colors.status.error, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
            <Card
              size={isMobile ? 'small' : 'default'}
              style={{
                background: theme.colors.card.background,
                borderColor: theme.colors.border.default,
              }}
            >
              <Statistic
                title={
                  <Space size={isMobile ? 'small' : 'middle'}>
                    <DollarOutlined style={{ color: theme.colors.status.info }} />
                    <span style={{ fontSize: isMobile ? '11px' : '14px' }}>
                      {isMobile ? 'Ekuitas' : 'Total Ekuitas'}
                    </span>
                  </Space>
                }
                value={data.summary.totalEquity}
                precision={0}
                valueStyle={{ color: theme.colors.status.info, fontSize: isMobile ? '18px' : '28px' }}
                prefix="Rp"
              />
            </Card>
          </div>

          {/* Assets Section */}
          <Card
            size={isMobile ? 'small' : 'default'}
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <BankOutlined style={{ color: theme.colors.status.success, fontSize: isMobile ? '14px' : '16px' }} />
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                  {isMobile ? 'Aset' : 'Aset (Assets)'}
                </span>
              </Space>
            }
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: isMobile ? '14px' : '18px', color: theme.colors.status.success }}>
                {formatCurrency(data.assets.total)}
              </Text>
            }
          >
            {data.assets.accounts.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={assetsData}
                  loading={isLoading}
                  entityType="balance-sheet-assets"
                  searchable
                  searchFields={['number', 'title']}
                  actions={mobileActions}
                  onRefresh={() => {}}
                />
              ) : (
                <Table
                  columns={accountColumns}
                  dataSource={data.assets.accounts}
                  rowKey="accountCode"
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary.Row style={{ background: theme.colors.background.tertiary }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong style={{ fontSize: '16px' }}>
                          Total Aset
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text
                          strong
                          style={{ fontSize: '18px', color: theme.colors.status.success }}
                        >
                          {formatCurrency(data.assets.total)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            ) : (
              <Empty description="Tidak ada aset" />
            )}
          </Card>

          {/* Liabilities Section */}
          <Card
            size={isMobile ? 'small' : 'default'}
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <DollarOutlined style={{ color: theme.colors.status.error, fontSize: isMobile ? '14px' : '16px' }} />
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                  {isMobile ? 'Kewajiban' : 'Kewajiban (Liabilities)'}
                </span>
              </Space>
            }
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: isMobile ? '14px' : '18px', color: theme.colors.status.error }}>
                {formatCurrency(data.liabilities.total)}
              </Text>
            }
          >
            {data.liabilities.accounts.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={liabilitiesData}
                  loading={isLoading}
                  entityType="balance-sheet-liabilities"
                  searchable
                  searchFields={['number', 'title']}
                  actions={mobileActions}
                  onRefresh={() => {}}
                />
              ) : (
                <Table
                  columns={accountColumns}
                  dataSource={data.liabilities.accounts}
                  rowKey="accountCode"
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary.Row style={{ background: theme.colors.background.tertiary }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong style={{ fontSize: '16px' }}>
                          Total Kewajiban
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text
                          strong
                          style={{ fontSize: '18px', color: theme.colors.status.error }}
                        >
                          {formatCurrency(data.liabilities.total)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            ) : (
              <Empty description="Tidak ada kewajiban" />
            )}
          </Card>

          {/* Equity Section */}
          <Card
            size={isMobile ? 'small' : 'default'}
            title={
              <Space size={isMobile ? 'small' : 'middle'}>
                <DollarOutlined style={{ color: theme.colors.status.info, fontSize: isMobile ? '14px' : '16px' }} />
                <span style={{ fontSize: isMobile ? '13px' : '14px' }}>
                  {isMobile ? 'Ekuitas' : 'Ekuitas (Equity)'}
                </span>
              </Space>
            }
            style={{
              marginBottom: isMobile ? '16px' : '24px',
              background: theme.colors.card.background,
              borderColor: theme.colors.border.default,
            }}
            extra={
              <Text strong style={{ fontSize: isMobile ? '14px' : '18px', color: theme.colors.status.info }}>
                {formatCurrency(data.equity.total)}
              </Text>
            }
          >
            {data.equity.accounts.length > 0 ? (
              isMobile ? (
                <MobileTableView
                  data={equityData}
                  loading={isLoading}
                  entityType="balance-sheet-equity"
                  searchable
                  searchFields={['number', 'title']}
                  actions={mobileActions}
                  onRefresh={() => {}}
                />
              ) : (
                <Table
                  columns={accountColumns}
                  dataSource={data.equity.accounts}
                  rowKey="accountCode"
                  pagination={false}
                  size="small"
                  summary={() => (
                    <Table.Summary.Row style={{ background: '#e6f7ff' }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <Text strong style={{ fontSize: '16px' }}>
                          Total Ekuitas
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text
                          strong
                          style={{ fontSize: '18px', color: theme.colors.status.info }}
                        >
                          {formatCurrency(data.equity.total)}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              )
            ) : (
              <Empty description="Tidak ada ekuitas" />
            )}
          </Card>

          {/* Total Summary */}
          <Card
            size={isMobile ? 'small' : 'default'}
            style={{
              background: data.summary.isBalanced
                ? theme.colors.background.tertiary
                : theme.colors.background.tertiary,
              borderColor: data.summary.isBalanced
                ? theme.colors.status.success
                : theme.colors.status.error,
              borderWidth: '2px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                padding: isMobile ? '8px 0' : '16px 0',
                gap: isMobile ? '8px' : '0',
              }}
            >
              <div>
                <Text style={{ fontSize: isMobile ? '14px' : '20px', fontWeight: 'bold' }}>
                  {isMobile ? 'Kewajiban + Ekuitas' : 'Total Kewajiban + Ekuitas'}
                </Text>
              </div>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                <Text
                  style={{
                    fontSize: isMobile ? '20px' : '32px',
                    fontWeight: 'bold',
                    color: data.summary.isBalanced
                      ? theme.colors.status.success
                      : theme.colors.status.error,
                  }}
                >
                  {formatCurrency(data.summary.liabilitiesAndEquity)}
                </Text>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default BalanceSheetPage;
