import React from 'react';
import { Modal, Form, Input, Select, InputNumber, Space } from 'antd';
import { useIsMobile } from '../../../../hooks/useMediaQuery';
import type { Project } from '../../../../services/projects';
import type { CreateReportDto } from '../../types/report.types';

interface CreateReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateReportDto) => void;
  projects: Project[];
  loading?: boolean;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  open,
  onClose,
  onSubmit,
  projects,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const isMobile = useIsMobile();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Create New Report"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={isMobile ? '100%' : 600}
      style={isMobile ? { top: 20, paddingBottom: 0 } : undefined}
      confirmLoading={loading}
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="projectId"
          label="Project"
          rules={[{ required: true, message: 'Please select a project' }]}
        >
          <Select
            showSearch
            placeholder="Select a project"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {projects.map((project) => (
              <Select.Option key={project.id} value={project.id}>
                {project.number} - {project.description}
                {project.client && ` (${project.client.company || project.client.name})`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="title"
          label="Report Title"
          rules={[{ required: true, message: 'Please enter title' }]}
        >
          <Input placeholder="e.g., December 2024 Social Media Report" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="Optional description" />
        </Form.Item>

        <Space
          style={{ width: '100%' }}
          direction={isMobile ? 'vertical' : 'horizontal'}
          size="middle"
        >
          <Form.Item
            name="month"
            label="Month"
            rules={[{ required: true, message: 'Required' }]}
            style={{
              width: isMobile ? '100%' : '150px',
              marginBottom: isMobile ? 0 : undefined,
            }}
          >
            <Select placeholder="Select month">
              {Array.from({ length: 12 }, (_, i) => (
                <Select.Option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="year"
            label="Year"
            rules={[{ required: true, message: 'Required' }]}
            style={{ width: isMobile ? '100%' : '150px', marginBottom: 0 }}
          >
            <InputNumber
              min={2020}
              max={2030}
              placeholder="2024"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};
