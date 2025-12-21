import React from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { usePresentationStore, type TransitionType } from '../../stores/presentationStore';

interface PresentButtonProps {
  disabled?: boolean;
}

export const PresentButton: React.FC<PresentButtonProps> = ({ disabled }) => {
  const {
    startPresentation,
    transition,
    setTransition,
    setCurrentSlide,
    currentSlideIndex,
  } = usePresentationStore();

  const handlePresent = () => {
    startPresentation();
  };

  const handlePresentFromStart = () => {
    setCurrentSlide(0);
    startPresentation();
  };

  const handlePresentFromCurrent = () => {
    startPresentation();
  };

  const transitionItems: MenuProps['items'] = [
    { key: 'none', label: 'No transition' },
    { key: 'fade', label: 'Fade' },
    { key: 'slide-left', label: 'Slide Left' },
    { key: 'slide-right', label: 'Slide Right' },
    { key: 'zoom', label: 'Zoom' },
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: 'from-start',
      label: 'Present from start',
      onClick: handlePresentFromStart,
    },
    {
      key: 'from-current',
      label: `Present from slide ${currentSlideIndex + 1}`,
      onClick: handlePresentFromCurrent,
    },
    { type: 'divider' },
    {
      key: 'transition',
      label: 'Transition',
      children: transitionItems.map((item) =>
        item.type === 'divider'
          ? item
          : {
              ...item,
              onClick: () => setTransition((item as any).key as TransitionType),
              icon: transition === (item as any).key ? '✓' : null,
            }
      ),
    },
  ];

  return (
    <Dropdown.Button
      type="primary"
      icon={<SettingOutlined />}
      menu={{ items: menuItems }}
      onClick={handlePresent}
      disabled={disabled}
    >
      <PlayCircleOutlined /> Present
    </Dropdown.Button>
  );
};

export default PresentButton;
