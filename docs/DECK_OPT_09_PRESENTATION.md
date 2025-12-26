# Phase 9: Presentation Mode

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_08_TEMPLATES.md` first
> **Estimated Complexity**: Medium

## Overview

Create a fullscreen presentation mode with slide navigation, keyboard controls, and optional transitions.

---

## Step 1: Create Presentation Store

**File**: `frontend/src/features/deck-editor/stores/presentationStore.ts`

```typescript
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
    set({ isPresenting: false, showOverview: false });
    // Exit fullscreen
    document.exitFullscreen?.().catch(console.error);
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
}));
```

---

## Step 2: Create Presentation Keyboard Hook

**File**: `frontend/src/features/deck-editor/hooks/usePresentationKeyboard.ts`

```typescript
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
```

---

## Step 3: Create Slide Renderer Component

**File**: `frontend/src/features/deck-editor/components/presentation/SlideRenderer.tsx`

```tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { fabric } from 'fabric';
import { TransitionType } from '../../stores/presentationStore';

interface SlideRendererProps {
  slideData: string; // JSON serialized fabric canvas
  width: number;
  height: number;
  transition?: TransitionType;
  isActive?: boolean;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slideData,
  width,
  height,
  transition = 'none',
  isActive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.StaticCanvas | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    fabricRef.current = new fabric.StaticCanvas(canvasRef.current, {
      width,
      height,
      renderOnAddRemove: false,
    });

    return () => {
      fabricRef.current?.dispose();
    };
  }, [width, height]);

  // Load slide data
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !slideData) return;

    try {
      const data = JSON.parse(slideData);
      canvas.loadFromJSON(data, () => {
        canvas.renderAll();
      });
    } catch (e) {
      console.error('Failed to load slide data:', e);
    }
  }, [slideData]);

  // Get transition classes
  const transitionClasses = useMemo(() => {
    if (!isActive) return 'opacity-0 pointer-events-none';

    switch (transition) {
      case 'fade':
        return 'transition-opacity duration-500 ease-in-out opacity-100';
      case 'slide-left':
        return 'transition-transform duration-500 ease-in-out translate-x-0';
      case 'slide-right':
        return 'transition-transform duration-500 ease-in-out translate-x-0';
      case 'zoom':
        return 'transition-transform duration-500 ease-in-out scale-100 opacity-100';
      default:
        return 'opacity-100';
    }
  }, [transition, isActive]);

  return (
    <div className={`absolute inset-0 flex items-center justify-center ${transitionClasses}`}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default SlideRenderer;
```

---

## Step 4: Create Presentation View Component

**File**: `frontend/src/features/deck-editor/components/presentation/PresentationView.tsx`

```tsx
import React, { useEffect, useCallback, useState } from 'react';
import { usePresentationStore } from '../../stores/presentationStore';
import { usePresentationKeyboard } from '../../hooks/usePresentationKeyboard';
import { SlideRenderer } from './SlideRenderer';
import { PresentationControls } from './PresentationControls';
import { PresentationOverview } from './PresentationOverview';
import { LaserPointer } from './LaserPointer';

interface Slide {
  id: string;
  data: string; // JSON serialized canvas
  order: number;
}

interface PresentationViewProps {
  slides: Slide[];
}

export const PresentationView: React.FC<PresentationViewProps> = ({ slides }) => {
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
          {/* Current slide */}
          {currentSlide && (
            <SlideRenderer
              key={currentSlide.id}
              slideData={currentSlide.data}
              width={dimensions.width}
              height={dimensions.height}
              transition={transition}
              isActive={true}
            />
          )}

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
```

---

## Step 5: Create Presentation Controls

**File**: `frontend/src/features/deck-editor/components/presentation/PresentationControls.tsx`

```tsx
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
import { usePresentationStore } from '../../stores/presentationStore';

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
```

---

## Step 6: Create Presentation Overview

**File**: `frontend/src/features/deck-editor/components/presentation/PresentationOverview.tsx`

```tsx
import React from 'react';
import { usePresentationStore } from '../../stores/presentationStore';

interface Slide {
  id: string;
  data: string;
  order: number;
}

interface PresentationOverviewProps {
  slides: Slide[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export const PresentationOverview: React.FC<PresentationOverviewProps> = ({
  slides,
  currentIndex,
  onSelect,
}) => {
  const { toggleOverview } = usePresentationStore();

  return (
    <div
      className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-8 overflow-auto"
      onClick={toggleOverview}
    >
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`,
          maxWidth: '1400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`relative cursor-pointer transition-all hover:scale-105 ${
              index === currentIndex
                ? 'ring-4 ring-blue-500'
                : 'ring-2 ring-white/30 hover:ring-white/60'
            }`}
            onClick={() => onSelect(index)}
          >
            {/* Slide thumbnail */}
            <div className="aspect-video bg-white rounded overflow-hidden">
              {/* Simple preview - in production, render actual canvas thumbnail */}
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Slide {index + 1}
              </div>
            </div>

            {/* Slide number */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-1 text-sm">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Close hint */}
      <div className="absolute top-4 right-4 text-white/60 text-sm">
        Press G or click outside to close
      </div>
    </div>
  );
};

export default PresentationOverview;
```

---

## Step 7: Create Laser Pointer

**File**: `frontend/src/features/deck-editor/components/presentation/LaserPointer.tsx`

```tsx
import React, { useEffect, useState } from 'react';

export const LaserPointer: React.FC = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Outer glow */}
      <div
        className="absolute rounded-full bg-red-500/30 animate-pulse"
        style={{
          width: 30,
          height: 30,
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />
      {/* Inner dot */}
      <div
        className="absolute rounded-full bg-red-500"
        style={{
          width: 10,
          height: 10,
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
          boxShadow: '0 0 10px 2px rgba(239, 68, 68, 0.8)',
        }}
      />
    </div>
  );
};

export default LaserPointer;
```

---

## Step 8: Create Present Button

**File**: `frontend/src/features/deck-editor/components/PresentButton.tsx`

```tsx
import React from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { usePresentationStore, TransitionType } from '../stores/presentationStore';

interface PresentButtonProps {
  disabled?: boolean;
}

export const PresentButton: React.FC<PresentButtonProps> = ({ disabled }) => {
  const {
    startPresentation,
    transition,
    setTransition,
    setCurrentSlide,
    currentSlideIndex,
  } = usePresentationStore();

  const handlePresent = () => {
    startPresentation();
  };

  const handlePresentFromStart = () => {
    setCurrentSlide(0);
    startPresentation();
  };

  const handlePresentFromCurrent = () => {
    startPresentation();
  };

  const transitionItems: MenuProps['items'] = [
    { key: 'none', label: 'No transition' },
    { key: 'fade', label: 'Fade' },
    { key: 'slide-left', label: 'Slide Left' },
    { key: 'slide-right', label: 'Slide Right' },
    { key: 'zoom', label: 'Zoom' },
  ];

  const menuItems: MenuProps['items'] = [
    {
      key: 'from-start',
      label: 'Present from start',
      onClick: handlePresentFromStart,
    },
    {
      key: 'from-current',
      label: `Present from slide ${currentSlideIndex + 1}`,
      onClick: handlePresentFromCurrent,
    },
    { type: 'divider' },
    {
      key: 'transition',
      label: 'Transition',
      children: transitionItems.map((item) =>
        item.type === 'divider'
          ? item
          : {
              ...item,
              onClick: () => setTransition((item as any).key as TransitionType),
              icon: transition === (item as any).key ? '✓' : null,
            }
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
      <PlayCircleOutlined /> Present
    </Dropdown.Button>
  );
};

export default PresentButton;
```

---

## Step 9: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './stores/presentationStore';
export * from './hooks/usePresentationKeyboard';
export * from './components/presentation/SlideRenderer';
export * from './components/presentation/PresentationView';
export * from './components/presentation/PresentationControls';
export * from './components/presentation/PresentationOverview';
export * from './components/presentation/LaserPointer';
export * from './components/PresentButton';
```

---

## Step 10: Integration into Editor

**Edit**: Main deck editor page to include presentation components:

```tsx
import { PresentButton } from './PresentButton';
import { PresentationView } from './presentation/PresentationView';

// In the component:
// Add PresentButton to toolbar
<PresentButton disabled={slides.length === 0} />

// Add PresentationView at root level
<PresentationView slides={slides} />
```

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Present button appears in toolbar
3. [ ] Clicking Present enters fullscreen mode
4. [ ] Right arrow / Space moves to next slide
5. [ ] Left arrow moves to previous slide
6. [ ] Escape exits presentation mode
7. [ ] Home key goes to first slide
8. [ ] End key goes to last slide
9. [ ] Number keys 1-9 jump to that slide
10. [ ] G key opens slide overview grid
11. [ ] P key enables laser pointer
12. [ ] Laser pointer follows mouse cursor
13. [ ] Controls appear on mouse movement
14. [ ] Controls hide after 3 seconds of no movement
15. [ ] Transitions work (fade, slide, zoom)
16. [ ] Auto-play advances slides automatically

---

## Common Issues

1. **Fullscreen not working**: Some browsers block fullscreen without user interaction
2. **Slides not loading**: Check JSON parsing of slide data
3. **Laser pointer offset**: Ensure transform translate is correct
4. **Keyboard not responding**: Check event listeners are bound
5. **Transitions choppy**: Reduce transition duration or disable for low-end devices
