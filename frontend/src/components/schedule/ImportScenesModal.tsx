import { Modal, Select, App } from 'antd';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Props {
  open: boolean;
  scheduleId: string;
  shotListId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportScenesModal({
  open,
  scheduleId,
  shotListId,
  onClose,
  onSuccess,
}: Props) {
  const { message } = App.useApp();
  const [selectedShotListId, setSelectedShotListId] = useState<string | null>(
    shotListId || null
  );

  const handleImport = () => {
    if (!selectedShotListId) {
      message.error('Please select a shot list');
      return;
    }

    // TODO: Implement scene import when shot list API is available
    message.info('Scene import will be implemented in next phase');
    onClose();
  };

  return (
    <Modal
      title="Import Scenes"
      open={open}
      onCancel={onClose}
      onOk={handleImport}
      okText="Import"
    >
      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Select Shot List
        </label>
        <Select
          placeholder="Choose a shot list..."
          value={selectedShotListId}
          onChange={setSelectedShotListId}
          options={[
            // TODO: Load shot lists from API
            { label: 'Load shot lists from API', value: '' },
          ]}
          style={{ width: '100%' }}
        />
      </div>
    </Modal>
  );
}
