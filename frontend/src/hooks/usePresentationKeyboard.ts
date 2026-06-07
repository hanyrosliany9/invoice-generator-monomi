import { useEffect, useCallback } from 'react';
import { usePresentationStore } from '../stores/presentationStore';

export const usePresentationKeyboard = () => {
  const {
    isPresenting,
    endPresentation,
    nextSlide,
    previousSlide,
    goToSlide,
    totalSlides,
    toggleOverview,
    togglePointer,
  } = usePresentationStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPresenting) return;

    switch (e.key) {
      // Exit presentation
      case 'Escape':
        endPresentation();
        break;

      // Next slide
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'Enter':
      case 'PageDown':
        e.preventDefault();
        nextSlide();
        break;

      // Previous slide
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'Backspace':
      case 'PageUp':
        e.preventDefault();
        previousSlide();
        break;

      // First slide
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;

      // Last slide
      case 'End':
        e.preventDefault();
        goToSlide(totalSlides - 1);
        break;

      // Toggle overview
      case 'g':
      case 'o':
        e.preventDefault();
        toggleOverview();
        break;

      // Toggle pointer
      case 'p':
      case 'l':
        e.preventDefault();
        togglePointer();
        break;

      // Number keys for direct slide access (1-9)
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        const slideNum = parseInt(e.key, 10) - 1;
        if (slideNum < totalSlides) {
          e.preventDefault();
          goToSlide(slideNum);
        }
        break;
    }
  }, [
    isPresenting,
    endPresentation,
    nextSlide,
    previousSlide,
    goToSlide,
    totalSlides,
    toggleOverview,
    togglePointer,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export default usePresentationKeyboard;
