import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  AppstoreOutlined,
  AimOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { usePresentationStore } from '../../../stores/presentationStore';

interface PresentationControlsProps {
  visible: boolean;
}

export const PresentationControls: React.FC<PresentationControlsProps> = ({ visible }) => {
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
        <Tooltip title="Previous slide (←)">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={previousSlide}
            disabled={isFirstSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title="Next slide (→)">
          <Button
            type="text"
            icon={<RightOutlined />}
            onClick={nextSlide}
            disabled={isLastSlide}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title="Slide overview (G)">
          <Button
            type="text"
            icon={<AppstoreOutlined />}
            onClick={toggleOverview}
            className="text-white hover:bg-white/20"
          />
        </Tooltip>

        <Tooltip title="Laser pointer (P)">
          <Button
            type="text"
            icon={<AimOutlined />}
            onClick={togglePointer}
            className={`text-white hover:bg-white/20 ${showPointer ? 'bg-red-500/50' : ''}`}
          />
        </Tooltip>

        <Tooltip title={autoPlay ? 'Pause auto-play' : 'Start auto-play'}>
          <Button
            type="text"
            icon={autoPlay ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => setAutoPlay(!autoPlay)}
            className={`text-white hover:bg-white/20 ${autoPlay ? 'bg-green-500/50' : ''}`}
          />
        </Tooltip>

        <div className="w-px h-6 bg-white/30 mx-2" />

        <Tooltip title="Exit presentation (Esc)">
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
