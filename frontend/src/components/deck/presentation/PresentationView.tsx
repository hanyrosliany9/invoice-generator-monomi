import React, { useEffect, useCallback, useRef, useState } from 'react';
import { usePresentationStore } from '../../../stores/presentationStore';
import { usePresentationKeyboard } from '../../../hooks/usePresentationKeyboard';
import PresentSlideRenderer from './PresentSlideRenderer';
import PresentationControls from './PresentationControls';
import PresentationOverview from './PresentationOverview';
import LaserPointer from './LaserPointer';
import PresenterView from './PresenterView';
import type { DeckSlide } from '@/types/deck';
import type { TransitionType } from '../../../stores/presentationStore';

interface PresentationViewProps {
  slides: DeckSlide[];
  onExit?: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ slides, onExit }) => {
  const {
    isPresenting,
    currentSlideIndex,
    showPointer,
    showOverview,
    showPresenterView,
    showNotesCaption,
    autoPlay,
    autoPlayInterval,
    nextSlide,
    setTotalSlides,
    goToSlide,
    endPresentation,
    transition: globalTransition,
  } = usePresentationStore();

  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [showControls, setShowControls] = useState(false);

  // Track the transition to apply for the currently displayed slide.
  // We snapshot it when currentSlideIndex changes (before the new slide is
  // rendered) so even rapid navigation sees the right transition per slide.
  const [activeTransition, setActiveTransition] = useState<TransitionType>('none');
  const [activeDuration, setActiveDuration] = useState<number>(400);

  // Ref for the slide stage element (used by LaserPointer for bounds)
  const stageRef = useRef<HTMLDivElement>(null);

  // FIX 1: single timer ref for controls auto-hide — prevents stacking
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enable keyboard controls
  usePresentationKeyboard();

  // Set total slides
  useEffect(() => {
    setTotalSlides(slides.length);
  }, [slides.length, setTotalSlides]);

  // Resolve the effective transition for a given slide index.
  // Per-slide transition takes priority over the global store fallback.
  const resolveTransition = useCallback(
    (index: number): { transition: TransitionType; duration: number } => {
      const slide = slides[index];
      if (!slide) return { transition: 'none', duration: 400 };
      const t = (slide.transition as TransitionType) || globalTransition;
      const d = slide.transitionDuration ?? 400;
      return { transition: t || 'none', duration: d };
    },
    [slides, globalTransition],
  );

  // When currentSlideIndex changes, snapshot the incoming slide's transition
  // so PresentSlideRenderer gets the right animation on mount.
  const prevIndexRef = useRef<number>(currentSlideIndex);
  useEffect(() => {
    if (prevIndexRef.current !== currentSlideIndex) {
      const { transition, duration } = resolveTransition(currentSlideIndex);
      setActiveTransition(transition);
      setActiveDuration(duration);
      prevIndexRef.current = currentSlideIndex;
    }
  }, [currentSlideIndex, resolveTransition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const aspectRatio = 16 / 9;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let width = windowWidth;
      let height = windowWidth / aspectRatio;

      if (height > windowHeight) {
        height = windowHeight;
        width = windowHeight * aspectRatio;
      }

      setDimensions({ width, height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FIX 2: Auto-play — loops back to slide 0 at the end instead of
  // dead-ending.  The interval is re-created whenever currentSlideIndex
  // changes so that manual navigation resets the cadence (no double-fire).
  useEffect(() => {
    if (!isPresenting || !autoPlay) return;

    const timer = setInterval(() => {
      const { currentSlideIndex: idx, totalSlides, goToSlide: go, nextSlide: next } =
        usePresentationStore.getState();
      if (idx >= totalSlides - 1) {
        // Loop back to the beginning
        go(0);
      } else {
        next();
      }
    }, autoPlayInterval * 1000);

    return () => clearInterval(timer);
    // Re-run (reset interval) whenever the slide changes due to manual nav
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting, autoPlay, autoPlayInterval, currentSlideIndex]);

  // FIX 5: Reconcile isPresenting when the user exits browser fullscreen
  // (F11 / OS-level Esc) without going through our own endPresentation().
  useEffect(() => {
    if (!isPresenting) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Browser left fullscreen externally — sync our state.
        // Guard: endPresentation itself calls exitFullscreen which is a
        // no-op when already exited, so there is no double-exit loop.
        endPresentation();
        onExit?.();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPresenting, endPresentation, onExit]);

  // FIX 1: Mouse movement — reuse single timer ref, clear before setting new one
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current !== null) {
      clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
      controlsTimerRef.current = null;
    }, 3000);
  }, []);

  // FIX 1: Clear the controls timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimerRef.current !== null) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  if (!isPresenting) return null;

  const currentSlide = slides[currentSlideIndex];
  const nextSlideData = slides[currentSlideIndex + 1] ?? null;

  // ── Presenter view ────────────────────────────────────────────────────────
  if (showPresenterView) {
    return (
      <PresenterView
        slides={slides}
        currentSlide={currentSlide}
        nextSlide={nextSlideData}
        currentIndex={currentSlideIndex}
        stageWidth={dimensions.width}
        stageHeight={dimensions.height}
      />
    );
  }

  // ── Audience / main present view ──────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black z-50 cursor-none"
      onMouseMove={handleMouseMove}
    >
      {/* Slide container */}
      <div className="w-full h-full flex items-center justify-center">
        {/* FIX 3: stageRef attached so LaserPointer can normalise coords */}
        <div
          ref={stageRef}
          className="relative bg-white overflow-hidden"
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {/* Current slide — rendered from its persisted content + elements.
              Keyed on slide.id so each navigation remounts a fresh instance,
              triggering the enter animation from scratch. */}
          {currentSlide && (
            <PresentSlideRenderer
              key={`${currentSlide.id}-${currentSlideIndex}`}
              slide={currentSlide}
              width={dimensions.width}
              height={dimensions.height}
              transition={activeTransition}
              transitionDuration={activeDuration}
            />
          )}

          {/* Laser pointer — receives stageRef for proper coordinate mapping */}
          {showPointer && <LaserPointer stageRef={stageRef} />}
        </div>
      </div>

      {/* Controls overlay */}
      <PresentationControls visible={showControls} />

      {/* Slide overview modal */}
      {showOverview && (
        <PresentationOverview
          slides={slides}
          currentIndex={currentSlideIndex}
          onSelect={goToSlide}
        />
      )}

      {/* Slide counter */}
      <div
        className={`absolute bottom-4 right-4 text-white text-lg font-medium transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {currentSlideIndex + 1} / {slides.length}
      </div>

      {/* Speaker-notes caption — toggled via 'N' key or controls button */}
      {showNotesCaption && currentSlide?.notes && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-3xl w-full px-4">
          <div className="bg-black/80 text-white text-sm rounded-lg px-4 py-3 text-center leading-relaxed">
            {currentSlide.notes}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentationView;
