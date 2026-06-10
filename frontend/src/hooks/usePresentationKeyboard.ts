import { useEffect, useCallback, useRef } from 'react';
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
    togglePresenterView,
    toggleNotesCaption,
  } = usePresentationStore();

  // FIX 4: buffer for multi-digit slide-number entry
  const digitBufferRef = useRef<string>('');
  const digitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Commit whatever is in the digit buffer as a slide jump
  const commitDigitBuffer = useCallback(() => {
    if (digitTimerRef.current !== null) {
      clearTimeout(digitTimerRef.current);
      digitTimerRef.current = null;
    }
    const buf = digitBufferRef.current;
    digitBufferRef.current = '';
    if (!buf) return;
    const slideNum = parseInt(buf, 10) - 1; // convert 1-based input to 0-based index
    const { totalSlides: total, goToSlide: go } = usePresentationStore.getState();
    if (slideNum >= 0 && slideNum < total) {
      go(slideNum);
    }
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPresenting) return;

    // FIX 4: intercept digit keys (0-9) for buffered slide navigation.
    // Use e.key so that numpad digits ('0'–'9') are also handled.
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      digitBufferRef.current += e.key;

      // Auto-commit after 1 second of no further digit input
      if (digitTimerRef.current !== null) {
        clearTimeout(digitTimerRef.current);
      }
      digitTimerRef.current = setTimeout(() => {
        commitDigitBuffer();
      }, 1000);
      return;
    }

    switch (e.key) {
      // Exit presentation — also clears any pending digit buffer
      case 'Escape':
        digitBufferRef.current = '';
        if (digitTimerRef.current !== null) {
          clearTimeout(digitTimerRef.current);
          digitTimerRef.current = null;
        }
        endPresentation();
        break;

      // Next slide
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        nextSlide();
        break;

      // FIX 4: Enter commits the digit buffer if one is pending; otherwise
      // it acts as "next slide" (original behaviour).
      case 'Enter':
        e.preventDefault();
        if (digitBufferRef.current) {
          commitDigitBuffer();
        } else {
          nextSlide();
        }
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

      // Toggle presenter view
      case 's':
      case 'S':
        e.preventDefault();
        togglePresenterView();
        break;

      // Toggle notes caption (audience view)
      case 'n':
      case 'N':
        e.preventDefault();
        toggleNotesCaption();
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
    togglePresenterView,
    toggleNotesCaption,
    commitDigitBuffer,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Clean up any pending digit timer on unmount
      if (digitTimerRef.current !== null) {
        clearTimeout(digitTimerRef.current);
      }
    };
  }, [handleKeyDown]);
};

export default usePresentationKeyboard;
