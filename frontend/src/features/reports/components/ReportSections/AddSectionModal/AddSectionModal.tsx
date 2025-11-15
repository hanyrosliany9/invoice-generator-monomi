import React, { useState } from 'react';
import { Modal, Form, Input, Upload, Button, Divider, Typography, theme } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import ColumnSelector from '../../../../../components/reports/ColumnSelector';
import { SampleDataLoader } from './SampleDataLoader';
import { useCSVProcessor } from '../../../hooks/useCSVProcessor';
import type { AddSectionDto } from '../../../types/report.types';

const { Text } = Typography;
const { TextArea } = Input;

interface AddSectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (file: File, data: AddSectionDto, selectedColumns: string[]) => Promise<void>;
  loading?: boolean;
}

/**
 * Modal component for adding a new section to a report
 * Handles CSV upload, column selection, and sample data loading
 *
 * @param open - Whether the modal is visible
 * @param onClose - Callback when modal is closed
 * @param onSubmit - Callback when form is submitted with file, data, and selected columns
 * @param loading - Whether submission is in progress
 */
export const AddSectionModal: React.FC<AddSectionModalProps> = ({
  open,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const { csvData, processFile, reset: resetCSV } = useCSVProcessor();

  // Handle file change
  const handleFileChange = async (fileList: UploadFile[]) => {
    if (fileList.length === 0) {
      setSelectedColumns([]);
      resetCSV();
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    try {
      const data = await processFile(file);
      setSelectedColumns(data.columns); // Select all by default
    } catch (error) {
      console.error('Failed to process CSV:', error);
    }
  };

  // Handle form submit
  const handleSubmit = async (values: any) => {
    const fileList = values.csvFile;
    const file = fileList?.[0]?.originFileObj;

    if (!file || !csvData) {
      return;
    }

    if (selectedColumns.length === 0) {
      return;
    }

    try {
      await onSubmit(
        file,
        {
          title: values.title,
          description: values.description,
        },
        selectedColumns
      );

      // Reset form on success
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Failed to add section:', error);
    }
  };

  // Handle modal close
  const handleClose = () => {
    form.resetFields();
    setSelectedColumns([]);
    resetCSV();
    onClose();
  };

  // Handle sample data load
  const handleSampleDataLoad = (file: File, title: string, description: string) => {
    form.setFieldsValue({
      title,
      description,
      csvFile: [{ originFileObj: file, name: file.name }],
    });
    handleFileChange([{ originFileObj: file, name: file.name } as any]);
  };

  return (
    <Modal
      title="Add New Section"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={700}
      confirmLoading={loading}
      okText="Add Section"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="title"
          label="Section Title"
          rules={[{ required: true, message: 'Please enter section title' }]}
        >
          <Input placeholder="e.g., Facebook Ads Performance" />
        </Form.Item>

        <Form.Item name="description" label="Description (Optional)">
          <TextArea rows={3} placeholder="Brief description of this section" />
        </Form.Item>

        <Form.Item
          name="csvFile"
          label="CSV/Excel File"
          valuePropName="fileList"
          getValueFromEvent={(e) => {
            if (Array.isArray(e)) {
              handleFileChange(e);
              return e;
            }
            handleFileChange(e?.fileList);
            return e?.fileList;
          }}
          rules={[{ required: true, message: 'Please upload a CSV or Excel file' }]}
        >
          <Upload beforeUpload={() => false} accept=".csv,.xlsx,.xls" maxCount={1}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
        </Form.Item>

        {csvData && csvData.columns.length > 0 && (
          <>
            <Divider orientation="left">Select Columns to Include</Divider>
            <ColumnSelector
              columns={csvData.columns}
              value={selectedColumns}
              onChange={setSelectedColumns}
            />
          </>
        )}

        <div
          style={{
            background: token.colorBgLayout,
            padding: token.paddingSM,
            borderRadius: token.borderRadiusLG,
            marginTop: token.marginMD,
          }}
        >
          <Text type="secondary">
            <strong>Tip:</strong> Upload any CSV or Excel file with your data. Deselect columns you
            don't want to include in the report.
          </Text>
        </div>

        <Divider />

        <SampleDataLoader onLoad={handleSampleDataLoad} />
      </Form>
    </Modal>
  );
};
