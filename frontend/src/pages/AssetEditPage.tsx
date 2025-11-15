import React, { useEffect, useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Result,
  Row,
  Select,
  Space,
  Spin,
} from 'antd'
import {
  CameraOutlined,
  SaveOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  EntityFormLayout,
  EntityHeroCard,
  ProgressiveSection,
} from '../components/forms'
import { assetService } from '../services/assets'
import { formatIDR, safeNumber } from '../utils/currency'
import dayjs from 'dayjs'
import { useTheme } from '../theme'

const { TextArea } = Input

interface AssetFormData {
  name: string
  category: string
  subcategory?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate: any
  purchasePrice: number
  supplier?: string
  invoiceNumber?: string
  warrantyExpiration?: any
  usefulLifeYears?: number
  residualValue?: number
  location?: string
  notes?: string
}

export const AssetEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<AssetFormData>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] = useState<AssetFormData | null>(null)

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id!),
    enabled: !!id,
  })

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      assetService.updateAsset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      message.success('Aset berhasil diperbarui')
      setHasChanges(false)
      navigate(`/assets/${id}`)
    },
    onError: () => {
      message.error('Gagal memperbarui aset')
    },
  })

  useEffect(() => {
    if (asset) {
      const formData: AssetFormData = {
        name: asset.name,
        category: asset.category,
        subcategory: asset.subcategory || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : null,
        purchasePrice: Number(asset.purchasePrice) || 0,
        supplier: asset.supplier || '',
        invoiceNumber: asset.invoiceNumber || '',
        warrantyExpiration: asset.warrantyExpiration ? dayjs(asset.warrantyExpiration) : null,
        usefulLifeYears: asset.usefulLifeYears || undefined,
        residualValue: Number(asset.residualValue) || 0,
        location: asset.location || '',
        notes: asset.notes || '',
      }
      form.setFieldsValue(formData)
      setOriginalValues(formData)
    }
  }, [asset, form])

  const handleFormChange = () => {
    const currentValues = form.getFieldsValue()
    const changed = originalValues && JSON.stringify(currentValues) !== JSON.stringify(originalValues)
    setHasChanges(!!changed)
  }

  const handleSubmit = async (values: AssetFormData) => {
    if (!id) return
    
    const submitData = {
      ...values,
      purchaseDate: values.purchaseDate ? dayjs(values.purchaseDate).toISOString() : undefined,
      warrantyExpiration: values.warrantyExpiration ? dayjs(values.warrantyExpiration).toISOString() : undefined,
    }
    
    updateAssetMutation.mutate({ id, data: submitData })
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      setHasChanges(false)
      message.info('Perubahan dibatalkan')
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size='large' tip='Memuat data aset...' spinning={true}>
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='404'
          title='Aset Tidak Ditemukan'
          subTitle='Aset yang Anda coba edit tidak ditemukan.'
          extra={
            <Button type='primary' onClick={() => navigate('/assets')}>
              Kembali ke Daftar Aset
            </Button>
          }
        />
      </div>
    )
  }

  const heroCard = (
    <EntityHeroCard
      title={asset.name}
      subtitle={`Edit informasi aset • ${asset.assetCode}`}
      icon={<CameraOutlined />}
      avatar={asset.assetCode}
      breadcrumb={['Aset', asset.name, 'Edit']}
      metadata={[
        {
          label: 'Kategori',
          value: asset.category,
        },
        {
          label: 'Status',
          value: asset.status,
        },
        {
          label: 'Harga Beli',
          value: asset.purchasePrice || 0,
          format: 'currency',
        },
      ]}
      actions={[
        {
          label: 'Batalkan Perubahan',
          type: 'default',
          icon: <UndoOutlined />,
          onClick: handleRevertChanges,
          disabled: !hasChanges,
        },
        {
          label: 'Simpan Perubahan',
          type: 'primary',
          icon: <SaveOutlined />,
          onClick: () => form.submit(),
          loading: updateAssetMutation.isPending,
          disabled: !hasChanges,
        },
      ]}
      status={
        hasChanges
          ? {
              type: 'warning',
              message: 'Anda memiliki perubahan yang belum disimpan',
            }
          : {
              type: 'info',
              message: 'Tidak ada perubahan',
            }
      }
    />
  )

  return (
    <EntityFormLayout hero={heroCard}>
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
        autoComplete='off'
        style={{ width: '100%' }}
      >
        <ProgressiveSection
          title='Informasi Dasar'
          subtitle='Detail aset dan kategori'
          icon={<CameraOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='name'
                label='Nama Aset'
                rules={[{ required: true, message: 'Masukkan nama aset' }]}
              >
                <Input placeholder='Canon EOS R5' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='category'
                label='Kategori'
                rules={[{ required: true, message: 'Pilih kategori' }]}
              >
                <Select placeholder='Pilih kategori' size='large'>
                  <Select.Option value='Camera'>Camera</Select.Option>
                  <Select.Option value='Lens'>Lens</Select.Option>
                  <Select.Option value='Lighting'>Lighting</Select.Option>
                  <Select.Option value='Audio'>Audio</Select.Option>
                  <Select.Option value='Computer'>Computer</Select.Option>
                  <Select.Option value='Accessories'>Accessories</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='subcategory' label='Sub-Kategori'>
                <Input placeholder='Mirrorless, DSLR, dll' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='location' label='Lokasi'>
                <Input placeholder='Studio A, Gudang, dll' size='large' />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        <ProgressiveSection
          title='Spesifikasi'
          subtitle='Brand, model, dan nomor seri'
          icon={<CameraOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name='manufacturer' label='Manufacturer'>
                <Input placeholder='Canon, Sony, dll' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='model' label='Model'>
                <Input placeholder='EOS R5, A7 III, dll' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name='serialNumber' label='Nomor Seri'>
                <Input placeholder='Serial number perangkat' size='large' />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        <ProgressiveSection
          title='Informasi Pembelian'
          subtitle='Harga, tanggal, dan supplier'
          icon={<CameraOutlined />}
          defaultOpen={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='purchasePrice'
                label='Harga Beli (IDR)'
                rules={[{ required: true, message: 'Masukkan harga beli' }]}
              >
                <InputNumber
                  placeholder='85000000'
                  size='large'
                  style={{ width: '100%' }}
                  formatter={value =>
                    `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={value => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='purchaseDate'
                label='Tanggal Pembelian'
                rules={[{ required: true, message: 'Pilih tanggal pembelian' }]}
              >
                <DatePicker
                  size='large'
                  style={{ width: '100%' }}
                  format='DD/MM/YYYY'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='supplier' label='Supplier'>
                <Input placeholder='Nama supplier' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name='invoiceNumber' label='Nomor Invoice'>
                <Input placeholder='INV-2025-001' size='large' />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name='warrantyExpiration' label='Tanggal Garansi Berakhir'>
                <DatePicker
                  size='large'
                  style={{ width: '100%' }}
                  format='DD/MM/YYYY'
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='usefulLifeYears'
                label='Umur Ekonomis (Tahun)'
                tooltip='Perkiraan masa manfaat aset untuk perhitungan penyusutan'
              >
                <InputNumber
                  placeholder='5'
                  size='large'
                  style={{ width: '100%' }}
                  min={1}
                  max={50}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name='residualValue'
                label='Nilai Sisa (IDR)'
                tooltip='Nilai perkiraan aset di akhir masa manfaat'
                dependencies={['purchasePrice']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const purchasePrice = getFieldValue('purchasePrice')
                      if (!value || !purchasePrice || value < purchasePrice) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('Nilai sisa harus lebih kecil dari harga pembelian'))
                    },
                  }),
                ]}
              >
                <InputNumber
                  placeholder='5000000'
                  size='large'
                  style={{ width: '100%' }}
                  formatter={value =>
                    `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={value => value!.replace(/Rp\s?|(,*)/g, '') as any}
                  min={0}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        <ProgressiveSection
          title='Catatan Tambahan'
          subtitle='Informasi tambahan tentang aset'
          icon={<CameraOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item name='notes' label='Catatan'>
                <TextArea
                  rows={4}
                  placeholder='Catatan tambahan tentang aset ini'
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        <Card
          style={{
            marginTop: '24px',
            textAlign: 'center',
            background: theme.colors.glass.background,
            backdropFilter: theme.colors.glass.backdropFilter,
            border: theme.colors.glass.border,
            boxShadow: theme.colors.glass.shadow,
          }}
        >
          <Space size='large'>
            <Button size='large' onClick={() => navigate(`/assets/${id}`)}>
              Batal
            </Button>
            <Button
              type='default'
              size='large'
              icon={<UndoOutlined />}
              onClick={handleRevertChanges}
              disabled={!hasChanges}
            >
              Batalkan Perubahan
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={updateAssetMutation.isPending}
              disabled={!hasChanges}
            >
              Simpan Perubahan
            </Button>
          </Space>
        </Card>
      </Form>
    </EntityFormLayout>
  )
}
