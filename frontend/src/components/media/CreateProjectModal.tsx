import React, { useState } from 'react';
import { Modal, Form, Input, Select, App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService } from '../../services/media-collab';
import { clientService } from '../../services/clients';
import { projectService } from '../../services/projects';
import { getErrorMessage } from '../../utils/errorHandlers';

const { TextArea } = Input;
const { Option } = Select;

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * CreateProjectModal
 *
 * Modal for creating a new media collaboration project.
 * Supports linking to existing clients and business projects.
 */
export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
    enabled: visible, // Only fetch when modal is open
  });

  // Fetch business projects for dropdown
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    enabled: visible, // Only fetch when modal is open
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await mediaCollabService.createProject(values);

      message.success('Project created successfully!');
      form.resetFields();
      onSuccess && onSuccess();
      onClose();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to create project'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!submitting) {
      form.resetFields();
      onClose();
    }
  };

  return (
    <Modal
      title="Create Media Project"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="Create"
      confirmLoading={submitting}
      width={600}
      maskClosable={!submitting}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Form.Item
          label="Project Name"
          name="name"
          rules={[
            { required: true, message: 'Please enter a project name' },
            { max: 255, message: 'Project name is too long' },
          ]}
        >
          <Input
            placeholder="e.g., Q4 2024 Marketing Campaign"
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          label="Description (optional)"
          name="description"
        >
          <TextArea
            rows={3}
            placeholder="Describe the purpose of this media project..."
            disabled={submitting}
          />
        </Form.Item>

        <Form.Item
          label="Link to Client (optional)"
          name="clientId"
          help="Associate this media project with an existing client"
        >
          <Select
            placeholder="Select a client"
            allowClear
            disabled={submitting}
            showSearch
            loading={clientsLoading}
            filterOption={(input, option) =>
              ((option?.label as string) || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {clients.map((client) => (
              <Option key={client.id} value={client.id}>
                {client.name} {client.company ? `(${client.company})` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="Link to Business Project (optional)"
          name="projectId"
          help="Associate this media project with an existing business project"
        >
          <Select
            placeholder="Select a business project"
            allowClear
            disabled={submitting}
            showSearch
            loading={projectsLoading}
            filterOption={(input, option) =>
              ((option?.label as string) || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {projects.map((project) => (
              <Option key={project.id} value={project.id}>
                {project.number} - {project.description}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateProjectModal;
