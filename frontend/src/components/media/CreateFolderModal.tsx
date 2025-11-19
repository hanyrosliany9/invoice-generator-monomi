import React, { useState, useEffect } from 'react';
import { Modal, Form, Input } from 'antd';

interface CreateFolderModalProps {
  visible: boolean;
  parentFolderName?: string;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => void;
  loading?: boolean;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  parentFolderName,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setFolderName('');
      setDescription('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      return;
    }

    onSubmit({
      name: folderName,
      description: description || undefined,
    });
  };

  const handleClose = () => {
    setFolderName('');
    setDescription('');
    onClose();
  };

  return (
    <Modal
      title={parentFolderName ? `Create Subfolder in "${parentFolderName}"` : 'Create Folder'}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={loading}
      okText="Create"
      cancelText="Cancel"
      okButtonProps={{ disabled: !folderName.trim() }}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Folder Name <span style={{ color: 'red' }}>*</span>
        </label>
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Enter folder name (letters, numbers, spaces allowed)"
          maxLength={255}
          autoFocus
          allowClear
          status={!folderName.trim() && folderName !== '' ? 'error' : ''}
        />
        {!folderName.trim() && folderName !== '' && (
          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>
            Please enter a folder name
          </div>
        )}
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Description (Optional)
        </label>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter folder description"
          rows={3}
          maxLength={1000}
        />
      </div>
    </Modal>
  );
};
