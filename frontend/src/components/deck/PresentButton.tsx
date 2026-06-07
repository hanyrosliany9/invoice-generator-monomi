import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { usePresentationStore, type TransitionType } from '../../stores/presentationStore';

interface PresentButtonProps {
  disabled?: boolean;
  /**
   * Called right before entering presentation mode (while the editor canvas is
   * still mounted) so any unsaved edits can be flushed to the DB — present mode
   * renders from the saved slide content/elements.
   */
  onBeforePresent?: () => Promise<void> | void;
}

export const PresentButton: React.FC<PresentButtonProps> = ({ disabled, onBeforePresent }) => {
  const { t } = useTranslation();
  const {
    startPresentation,
    transition,
    setTransition,
    setCurrentSlide,
    currentSlideIndex,
  } = usePresentationStore();

  const enter = async (before?: () => void) => {
    await onBeforePresent?.();
    before?.();
    startPresentation();
  };

  const handlePresent = () => {
    void enter();
  };

  const handlePresentFromStart = () => {
    void enter(() => setCurrentSlide(0));
  };

  const handlePresentFromCurrent = () => {
    void enter();
  };

  const transitionItems: MenuProps['items'] = [
    { key: 'none', label: t('deckPresent.transitionNone', 'No transition') },
    { key: 'fade', label: t('deckPresent.transitionFade', 'Fade') },
    { key: 'slide-left', label: t('deckPresent.transitionSlideLeft', 'Slide Left') },
    { key: 'slide-right', label: t('deckPresent.transitionSlideRight', 'Slide Right') },
    { key: 'zoom', label: t('deckPresent.transitionZoom', 'Zoom') },
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: 'from-start',
      label: t('deckPresent.fromStart', 'Present from start'),
      onClick: handlePresentFromStart,
    },
    {
      key: 'from-current',
      label: t('deckPresent.fromSlide', 'Present from slide {{n}}', { n: currentSlideIndex + 1 }),
      onClick: handlePresentFromCurrent,
    },
    { type: 'divider' },
    {
      key: 'transition',
      label: t('deckPresent.transition', 'Transition'),
      children: transitionItems?.map((item) =>
        item && 'type' in item && item.type === 'divider'
          ? item
          : item
            ? {
                ...item,
                onClick: () => setTransition((item as any).key as TransitionType),
                icon: transition === (item as any).key ? '✓' : undefined,
              }
            : item
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
      <PlayCircleOutlined /> {t('deckPresent.present', 'Present')}
    </Dropdown.Button>
  );
};

export default PresentButton;
