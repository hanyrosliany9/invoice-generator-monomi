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
