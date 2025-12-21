import React from 'react';
import { usePresentationStore } from '../../../stores/presentationStore';

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
