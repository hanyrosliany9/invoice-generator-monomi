import { Button, Tooltip } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { usePropertiesPanelStore } from '../../stores/propertiesPanelStore';

export default function PropertiesPanelToggle() {
  const { isOpen, togglePanel } = usePropertiesPanelStore();

  return (
    <Tooltip title={isOpen ? 'Hide Properties' : 'Show Properties'}>
      <Button
        icon={<SettingOutlined />}
        type={isOpen ? 'primary' : 'default'}
        onClick={togglePanel}
      />
    </Tooltip>
  );
}
