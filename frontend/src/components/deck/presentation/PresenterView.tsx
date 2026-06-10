import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  AppstoreOutlined,
  AimOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  PauseOutlined,
  RedoOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { usePresentationStore } from '../../../stores/presentationStore';
import PresentSlideRenderer from './PresentSlideRenderer';
import PresentationOverview from './PresentationOverview';
import type { DeckSlide } from '@/types/deck';

interface PresenterViewProps {
  slides: DeckSlide[];
  currentSlide: DeckSlide | null;
  nextSlide: DeckSlide | null;
  currentIndex: number;
  stageWidth: number;
  stageHeight: number;
}

/**
 * Presenter view — an in-page layout (no extra window required) that shows:
 *   • Current slide (large, ~70% width)
 *   • Next slide preview (smaller, top-right)
 *   • Speaker notes for the current slide (scrollable)
 *   • Elapsed timer with pause / reset
 *   • Slide position (n / total)
 *   • Full navigation controls
 *
 * Rendered when `showPresenterView` is true in the presentation store.
 * Press 'S' or click the monitor icon in the controls bar to toggle.
 */
const PresenterView: React.FC<PresenterViewProps> = ({
  slides,
  currentSlide,
  nextSlide,
  currentIndex,
  stageWidth,
  stageHeight,
}) => {
  const {
    totalSlides,
    previousSlide,
    nextSlide: goNext,
    goToSlide,
    showOverview,
    toggleOverview,
    showPointer,
    togglePointer,
    autoPlay,
    setAutoPlay,
    togglePresenterView,
    endPresentation,
  } = usePresentationStore();

  // ── Timer ────────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0); // seconds
  const [timerRunning, setTimerRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setElapsed(0);
    setTimerRunning(false);
  }, [stopTimer]);

  const toggleTimer = useCallback(() => {
    setTimerRunning((r) => {
      if (r) {
        stopTimer();
        return false;
      } else {
        startTimer();
        return true;
      }
    });
  }, [startTimer, stopTimer]);

  // Auto-start timer on mount, clean up on unmount
  useEffect(() => {
    startTimer();
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync interval with timerRunning state
  useEffect(() => {
    if (timerRunning) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [timerRunning, startTimer, stopTimer]);

  // ── Slide preview dimensions ─────────────────────────────────────────────
  // Current slide: fill ~65% of the left column at 16:9
  // Next slide preview: small thumbnail
  const aspectRatio = stageWidth / stageHeight; // nominally 16/9
  const mainPreviewWidth = Math.min(stageWidth * 0.55, 960);
  const mainPreviewHeight = mainPreviewWidth / aspectRatio;
  const nextPreviewWidth = Math.min(stageWidth * 0.22, 360);
  const nextPreviewHeight = nextPreviewWidth / aspectRatio;

  // ── Format timer ─────────────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isFirstSlide = currentIndex === 0;
  const isLastSlide = currentIndex === totalSlides - 1;

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800 shrink-0">
        {/* Left: slide position */}
        <div className="text-gray-300 text-sm font-mono font-medium">
          Slide <span className="text-white font-bold text-base">{currentIndex + 1}</span>
          <span className="text-gray-500"> / {totalSlides}</span>
        </div>

        {/* Centre: timer */}
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${
              timerRunning ? 'text-green-400' : 'text-yellow-400'
            }`}
          >
            {formatTime(elapsed)}
          </span>
          <Tooltip title={timerRunning ? 'Pause timer' : 'Resume timer'}>
            <Button
              type="text"
              size="small"
              icon={timerRunning ? <PauseOutlined /> : <PlayCircleOutlined />}
              onClick={toggleTimer}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            />
          </Tooltip>
          <Tooltip title="Reset timer">
            <Button
              type="text"
              size="small"
              icon={<RedoOutlined />}
              onClick={resetTimer}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            />
          </Tooltip>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <Tooltip title="Slide overview (G)">
            <Button
              type="text"
              size="small"
              icon={<AppstoreOutlined />}
              onClick={toggleOverview}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            />
          </Tooltip>
          <Tooltip title="Laser pointer (P)">
            <Button
              type="text"
              size="small"
              icon={<AimOutlined />}
              onClick={togglePointer}
              className={`text-gray-300 hover:text-white hover:bg-white/10 ${showPointer ? 'text-red-400' : ''}`}
            />
          </Tooltip>
          <Tooltip title={autoPlay ? 'Pause auto-play' : 'Start auto-play'}>
            <Button
              type="text"
              size="small"
              icon={autoPlay ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setAutoPlay(!autoPlay)}
              className={`text-gray-300 hover:text-white hover:bg-white/10 ${autoPlay ? 'text-green-400' : ''}`}
            />
          </Tooltip>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <Tooltip title="Back to audience view (S)">
            <Button
              type="text"
              size="small"
              icon={<DesktopOutlined />}
              onClick={togglePresenterView}
              className="text-purple-400 hover:text-white hover:bg-white/10"
            />
          </Tooltip>
          <Tooltip title="Exit presentation (Esc)">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={endPresentation}
              className="text-gray-300 hover:text-red-400 hover:bg-white/10"
            />
          </Tooltip>
        </div>
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">

        {/* LEFT: current slide (large) */}
        <div className="flex flex-col items-center justify-center flex-1 min-w-0">
          <div
            className="relative bg-white rounded-md overflow-hidden shadow-2xl shadow-black/50 ring-2 ring-purple-500/40"
            style={{ width: mainPreviewWidth, height: mainPreviewHeight }}
          >
            {currentSlide ? (
              <PresentSlideRenderer
                key={currentSlide.id}
                slide={currentSlide}
                width={mainPreviewWidth}
                height={mainPreviewHeight}
                transition="none"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No slide
              </div>
            )}
          </div>

          {/* Navigation buttons below current slide */}
          <div className="flex items-center gap-4 mt-4">
            <Tooltip title="Previous slide (←)">
              <Button
                size="large"
                icon={<LeftOutlined />}
                onClick={previousSlide}
                disabled={isFirstSlide}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-40"
              >
                Prev
              </Button>
            </Tooltip>
            <Tooltip title="Next slide (→)">
              <Button
                size="large"
                icon={<RightOutlined />}
                iconPosition="end"
                onClick={goNext}
                disabled={isLastSlide}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 disabled:opacity-40"
              >
                Next
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* RIGHT: next-slide preview + speaker notes */}
        <div
          className="flex flex-col gap-4 shrink-0"
          style={{ width: nextPreviewWidth + 24 }}
        >
          {/* Next slide preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
              Next slide
            </p>
            {nextSlide ? (
              <div
                className="relative bg-white rounded overflow-hidden ring-1 ring-white/10 shadow-lg cursor-pointer hover:ring-blue-400/50 transition-all"
                style={{ width: nextPreviewWidth, height: nextPreviewHeight }}
                onClick={goNext}
                title="Click to advance to next slide"
              >
                <PresentSlideRenderer
                  key={nextSlide.id}
                  slide={nextSlide}
                  width={nextPreviewWidth}
                  height={nextPreviewHeight}
                  transition="none"
                />
                {/* Subtle overlay to indicate it's a preview */}
                <div className="absolute inset-0 bg-black/5 pointer-events-none" />
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded ring-1 ring-white/10 text-gray-600 text-sm italic"
                style={{ width: nextPreviewWidth, height: nextPreviewHeight }}
              >
                End of deck
              </div>
            )}
          </div>

          {/* Speaker notes */}
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2 shrink-0">
              Speaker notes
            </p>
            <div
              className="flex-1 overflow-y-auto bg-gray-800 rounded-md p-3 text-gray-200 text-sm leading-relaxed border border-gray-700 min-h-0"
              style={{ maxHeight: 'calc(100vh - 400px)' }}
            >
              {currentSlide?.notes ? (
                <p className="whitespace-pre-wrap">{currentSlide.notes}</p>
              ) : (
                <p className="text-gray-500 italic">No speaker notes for this slide.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide overview modal — rendered on top of presenter view too */}
      {showOverview && (
        <PresentationOverview
          slides={slides}
          currentIndex={currentIndex}
          onSelect={goToSlide}
        />
      )}
    </div>
  );
};

export default PresenterView;
