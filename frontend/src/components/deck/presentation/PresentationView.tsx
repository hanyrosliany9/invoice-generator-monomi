import React, { useEffect, useCallback, useState } from 'react';
import { usePresentationStore } from '../../../stores/presentationStore';
import { usePresentationKeyboard } from '../../../hooks/usePresentationKeyboard';
import SlideRenderer from './SlideRenderer';
import PresentationControls from './PresentationControls';
import PresentationOverview from './PresentationOverview';
import LaserPointer from './LaserPointer';

interface Slide {
  id: string;
  data?: string;           // JSON-serialized Fabric canvas (legacy)
  order: number;
  title?: string;
  backgroundColor?: string;
  backgroundImage?: string;
}

interface PresentationViewProps {
  slides: Slide[];
  onExit?: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ slides, onExit }) => {
  const {
    isPresenting,
    currentSlideIndex,
    transition,
    showPointer,
    showOverview,
    autoPlay,
    autoPlayInterval,
    nextSlide,
    setTotalSlides,
    goToSlide,
  } = usePresentationStore();

  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [showControls, setShowControls] = useState(false);

  // Enable keyboard controls
  usePresentationKeyboard();

  // Set total slides
  useEffect(() => {
    setTotalSlides(slides.length);
  }, [slides.length, setTotalSlides]);

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

  // Auto-play timer
  useEffect(() => {
    if (!isPresenting || !autoPlay) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoPlayInterval * 1000);

    return () => clearInterval(timer);
  }, [isPresenting, autoPlay, autoPlayInterval, nextSlide]);

  // Mouse movement to show/hide controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isPresenting) return null;

  const currentSlide = slides[currentSlideIndex];

  return (
    <div
      className="fixed inset-0 bg-black z-50 cursor-none"
      onMouseMove={handleMouseMove}
    >
      {/* Slide container */}
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="relative bg-white"
          style={{
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {/* Current slide — if Fabric JSON data exists render on canvas, otherwise show background */}
          {currentSlide && currentSlide.data ? (
            <SlideRenderer
              key={currentSlide.id}
              slideData={currentSlide.data}
              width={dimensions.width}
              height={dimensions.height}
              transition={transition}
              isActive={true}
            />
          ) : currentSlide ? (
            <div
              key={currentSlide.id}
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: currentSlide.backgroundColor || '#ffffff' }}
            >
              {currentSlide.backgroundImage && (
                <img
                  src={currentSlide.backgroundImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              {currentSlide.title && (
                <span
                  className="relative z-10 text-4xl font-bold text-gray-900 text-center px-8"
                  style={{ textShadow: currentSlide.backgroundImage ? '0 2px 8px rgba(0,0,0,0.5)' : undefined }}
                >
                  {currentSlide.title}
                </span>
              )}
            </div>
          ) : null}

          {/* Laser pointer */}
          {showPointer && <LaserPointer />}
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
    </div>
  );
};

export default PresentationView;
