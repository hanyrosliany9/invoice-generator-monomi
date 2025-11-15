import React from 'react'
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from 'antd'
import { CameraOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  EntityHeroCard,
  OptimizedFormLayout,
  ProgressiveSection,
} from '../components/forms'
import { useOptimizedAutoSave } from '../hooks/useOptimizedAutoSave'
import { useMobileOptimized } from '../hooks/useMobileOptimized'
import { assetService } from '../services/assets'
import { useTheme } from '../theme'
import dayjs from 'dayjs'
import { now } from '../utils/date'

const { TextArea } = Input

interface AssetFormData {
  name: string
  category: string
  subcategory?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate: string
  purchasePrice: number
  supplier?: string
  invoiceNumber?: string
  warrantyExpiration?: string
  usefulLifeYears?: number
  residualValue?: number
  location?: string
  notes?: string
}

export const AssetCreatePage: React.FC = () => {
  const [form] = Form.useForm<AssetFormData>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()

  const mobile = useMobileOptimized()
  const performanceSettings = mobile.getPerformanceSettings()

  const autoSave = useOptimizedAutoSave({
    delay: performanceSettings.autoSaveDelay,
    messageApi: message,
    onSave: async (data: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-saving asset draft:', data)
      }
      await new Promise(resolve => setTimeout(resolve, 200))
    },
    onError: error => {
      console.error('Asset auto-save failed:', error)
    },
    enabled: true,
  })

  const createAssetMutation = useMutation({
    mutationFn: assetService.createAsset,
    onSuccess: asset => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      message.success('Aset berhasil dibuat')
      navigate(`/assets/${asset.id}`)
    },
    onError: () => {
      message.error('Gagal membuat aset')
    },
  })

  const handleSubmit = async (values: AssetFormData) => {
    if (autoSave.isSaving) {
      await autoSave.forceSave(values)
    }
    
    const submitData = {
      ...values,
      purchaseDate: values.purchaseDate ? dayjs(values.purchaseDate).toISOString() : now().toISOString(),
      warrantyExpiration: values.warrantyExpiration ? dayjs(values.warrantyExpiration).toISOString() : undefined,
    }
    
    createAssetMutation.mutate(submitData)
  }

  const handleSaveDraft = async () => {
    try {
      const values = form.getFieldsValue()
      await autoSave.forceSave(values)
    } catch (error) {
      message.error('Gagal menyimpan draft')
    }
  }

  const heroCard = (
    <EntityHeroCard
      title='Tambah Aset Baru'
      subtitle='Tambahkan informasi aset dan detail pembelian'
      icon={<CameraOutlined />}
      breadcrumb={['Aset', 'Tambah Baru']}
      actions={[
        {
          label: 'Simpan sebagai Draft',
          type: 'default',
          icon: <SaveOutlined />,
          onClick: handleSaveDraft,
          loading: autoSave.isSaving,
        },
      ]}
    />
  )

  return (
    <OptimizedFormLayout hero={heroCard}>
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        onValuesChange={() => {
          const values = form.getFieldsValue()
          if (values.name && values.category) {
            autoSave.triggerAutoSave(values)
          }
        }}
        autoComplete='off'
        style={{ width: '100%' }}
      >
        {/* Basic Information */}
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

        {/* Specifications */}
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

        {/* Purchase Information */}
        <ProgressiveSection
          title='Informasi Pembelian'
          subtitle='Harga, tanggal, dan supplier'
          icon={<CameraOutlined />}
          defaultOpen={true}
          required={true}
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

        {/* Additional Notes */}
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

        {/* Action Buttons */}
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
            <Button size='large' onClick={() => navigate('/assets')}>
              Batal
            </Button>
            <Button
              type='default'
              size='large'
              icon={<SaveOutlined />}
              onClick={handleSaveDraft}
              loading={autoSave.isSaving}
            >
              Simpan sebagai Draft
            </Button>
            <Button
              type='primary'
              size='large'
              icon={<SaveOutlined />}
              htmlType='submit'
              loading={createAssetMutation.isPending}
            >
              Buat Aset
            </Button>
          </Space>
        </Card>
      </Form>
    </OptimizedFormLayout>
  )
}
