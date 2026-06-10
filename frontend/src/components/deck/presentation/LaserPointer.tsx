import React, { useEffect, useRef, useState } from 'react';

interface LaserPointerProps {
  /** Ref to the slide stage element so we can normalise coordinates. */
  stageRef: React.RefObject<HTMLDivElement | null>;
}

export const LaserPointer: React.FC<LaserPointerProps> = ({ stageRef }) => {
  // FIX 3: position is now relative to the stage element (0–stageWidth / 0–stageHeight)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!stageRef.current) {
        // Fallback: hide rather than show a wrong position
        setIsVisible(false);
        return;
      }

      const rect = stageRef.current.getBoundingClientRect();

      // Normalise to stage-local coordinates
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Clamp to stage bounds
      const clampedX = Math.max(0, Math.min(rawX, rect.width));
      const clampedY = Math.max(0, Math.min(rawY, rect.height));

      // Only show the dot when the cursor is actually inside the stage
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      setPosition({ x: clampedX, y: clampedY });
      setIsVisible(inside);
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
  }, [stageRef]);

  if (!isVisible) return null;

  return (
    // FIX 3: positioned absolute inside the stage (not fixed on the viewport)
    <div
      className="pointer-events-none absolute z-50"
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
