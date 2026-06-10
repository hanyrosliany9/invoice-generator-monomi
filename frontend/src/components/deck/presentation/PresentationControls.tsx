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
} from '@ant-design/icons';
import { usePresentationStore } from '../../../stores/presentationStore';

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
        <Tooltip title={t('deckPresent.prevSlide', 'Previous slide (←)')}>
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={previousSlide}
            disabled={isFirstSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title={t('deckPresent.nextSlide', 'Next slide (→)')}>
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={nextSlide}
            disabled={isLastSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title={t('deckPresent.overview', 'Slide overview (G)')}>
          <Button
            type="text"
            icon={<AppstoreOutlined />}
            onClick={toggleOverview}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title={t('deckPresent.laserPointer', 'Laser pointer (P)')}>
          <Button
            type="text"
            icon={<AimOutlined />}
            onClick={togglePointer}
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

        <Tooltip title={t('deckPresent.notesCaption', 'Speaker notes caption (N)')}>
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={toggleNotesCaption}
            className={`text-white hover:bg-white/20 ${showNotesCaption ? 'bg-blue-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={showPresenterView ? t('deckPresent.audienceView', 'Audience view') : t('deckPresent.presenterView', 'Presenter view (S)')}>
          <Button
            type="text"
            icon={<DesktopOutlined />}
            onClick={togglePresenterView}
            className={`text-white hover:bg-white/20 ${showPresenterView ? 'bg-purple-500/50' : ''}`}
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title={t('deckPresent.exit', 'Exit presentation (Esc)')}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={endPresentation}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default PresentationControls;
