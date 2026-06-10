import { create } from 'zustand';

export type TransitionType = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';

interface PresentationState {
  // Presentation mode
  isPresenting: boolean;
  startPresentation: () => void;
  endPresentation: () => void;

  // Current slide
  currentSlideIndex: number;
  totalSlides: number;
  setCurrentSlide: (index: number) => void;
  setTotalSlides: (count: number) => void;

  // Navigation
  nextSlide: () => void;
  previousSlide: () => void;
  goToSlide: (index: number) => void;

  // Settings
  transition: TransitionType;
  setTransition: (type: TransitionType) => void;
  autoPlay: boolean;
  autoPlayInterval: number; // in seconds
  setAutoPlay: (enabled: boolean) => void;
  setAutoPlayInterval: (seconds: number) => void;

  // Pointer/Laser
  showPointer: boolean;
  togglePointer: () => void;

  // Slide overview (grid view)
  showOverview: boolean;
  toggleOverview: () => void;

  // Presenter view (in-page layout with current + next + notes + timer)
  showPresenterView: boolean;
  togglePresenterView: () => void;

  // Notes caption toggle (shown in audience view controls)
  showNotesCaption: boolean;
  toggleNotesCaption: () => void;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  // Presentation mode
  isPresenting: false,
  startPresentation: () => {
    set({ isPresenting: true, showOverview: false });
    // Request fullscreen
    document.documentElement.requestFullscreen?.().catch(console.error);
  },
  endPresentation: () => {
    set({ isPresenting: false, showOverview: false, showPresenterView: false });
    // FIX 5: Only request exitFullscreen when we are actually in fullscreen,
    // so the fullscreenchange listener in PresentationView doesn't cause a
    // double-exit loop (listener fires → endPresentation → exitFullscreen on
    // a null fullscreenElement would throw/warn).
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(console.error);
    }
  },

  // Current slide
  currentSlideIndex: 0,
  totalSlides: 0,
  setCurrentSlide: (index) => set({ currentSlideIndex: index }),
  setTotalSlides: (count) => set({ totalSlides: count }),

  // Navigation
  nextSlide: () => {
    const { currentSlideIndex, totalSlides } = get();
    if (currentSlideIndex < totalSlides - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },
  previousSlide: () => {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },
  goToSlide: (index) => {
    const { totalSlides } = get();
    if (index >= 0 && index < totalSlides) {
      set({ currentSlideIndex: index, showOverview: false });
    }
  },

  // Settings
  transition: 'fade',
  setTransition: (type) => set({ transition: type }),
  autoPlay: false,
  autoPlayInterval: 5,
  setAutoPlay: (enabled) => set({ autoPlay: enabled }),
  setAutoPlayInterval: (seconds) => set({ autoPlayInterval: seconds }),

  // Pointer
  showPointer: false,
  togglePointer: () => set((state) => ({ showPointer: !state.showPointer })),

  // Overview
  showOverview: false,
  toggleOverview: () => set((state) => ({ showOverview: !state.showOverview })),

  // Presenter view
  showPresenterView: false,
  togglePresenterView: () => set((state) => ({ showPresenterView: !state.showPresenterView })),

  // Notes caption
  showNotesCaption: false,
  toggleNotesCaption: () => set((state) => ({ showNotesCaption: !state.showNotesCaption })),
}));

export default usePresentationStore;
