import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  AppstoreOutlined,
  AimOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  DesktopOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { usePresentationStore } from '../../../stores/presentationStore';
import { ShortcutHint } from '@/components/ui/kbd';
import { ariaKeyShortcuts } from '@/shortcuts/registry';
import { openShortcutsHelp } from '@/shortcuts/helpKey';

const hint = (label: string, id: string) => <ShortcutHint label={label} id={id} tone="dark" />;

interface PresentationControlsProps {
  visible: boolean;
}

export const PresentationControls: React.FC<PresentationControlsProps> = ({ visible }) => {
  const { t } = useTranslation();
  const {
    endPresentation,
    nextSlide,
    previousSlide,
    currentSlideIndex,
    totalSlides,
    toggleOverview,
    showPointer,
    togglePointer,
    autoPlay,
    setAutoPlay,
    showPresenterView,
    togglePresenterView,
    showNotesCaption,
    toggleNotesCaption,
  } = usePresentationStore();

  const isFirstSlide = currentSlideIndex === 0;
  const isLastSlide = currentSlideIndex === totalSlides - 1;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 flex justify-center p-4 transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-2">
        <Tooltip title={hint(t('deckPresent.prevSlide', 'Previous slide'), 'presPrev')}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={previousSlide}
            aria-keyshortcuts={ariaKeyShortcuts('presPrev')}
            disabled={isFirstSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title={hint(t('deckPresent.nextSlide', 'Next slide'), 'presNext')}>
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={nextSlide}
            aria-keyshortcuts={ariaKeyShortcuts('presNext')}
            disabled={isLastSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title={hint(t('deckPresent.overview', 'Slide overview'), 'presOverview')}>
          <Button
            type="text"
            icon={<AppstoreOutlined />}
            onClick={toggleOverview}
            aria-keyshortcuts={ariaKeyShortcuts('presOverview')}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title={hint(t('deckPresent.laserPointer', 'Laser pointer'), 'presLaser')}>
          <Button
            type="text"
            icon={<AimOutlined />}
            onClick={togglePointer}
            aria-keyshortcuts={ariaKeyShortcuts('presLaser')}
            className={`text-white hover:bg-white/20 ${showPointer ? 'bg-red-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={autoPlay ? t('deckPresent.pauseAutoPlay', 'Pause auto-play') : t('deckPresent.startAutoPlay', 'Start auto-play')}>
          <Button
            type="text"
            icon={autoPlay ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setAutoPlay(!autoPlay)}
            className={`text-white hover:bg-white/20 ${autoPlay ? 'bg-green-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={hint(t('deckPresent.notesCaption', 'Speaker notes caption'), 'presNotes')}>
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={toggleNotesCaption}
            aria-keyshortcuts={ariaKeyShortcuts('presNotes')}
            className={`text-white hover:bg-white/20 ${showNotesCaption ? 'bg-blue-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={hint(showPresenterView ? t('deckPresent.audienceView', 'Audience view') : t('deckPresent.presenterView', 'Presenter view'), 'presPresenter')}>
          <Button
            type="text"
            icon={<DesktopOutlined />}
            onClick={togglePresenterView}
            aria-keyshortcuts={ariaKeyShortcuts('presPresenter')}
            className={`text-white hover:bg-white/20 ${showPresenterView ? 'bg-purple-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={hint(t('shortcuts.ui.helpButton'), 'helpOpen')}>
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            onClick={openShortcutsHelp}
            aria-keyshortcuts="Shift+/"
            aria-label={t('shortcuts.ui.helpButton')}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title={hint(t('deckPresent.exit', 'Exit presentation'), 'presExit')}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={endPresentation}
            aria-keyshortcuts={ariaKeyShortcuts('presExit')}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default PresentationControls;
