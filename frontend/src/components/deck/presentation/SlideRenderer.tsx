import React, { useEffect, useRef, useMemo } from 'react';
import { StaticCanvas } from 'fabric';
import type { TransitionType } from '../../../stores/presentationStore';

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
  const fabricRef = useRef<StaticCanvas | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    fabricRef.current = new StaticCanvas(canvasRef.current, {
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
