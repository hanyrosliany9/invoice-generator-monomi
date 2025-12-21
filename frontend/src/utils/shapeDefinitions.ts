import { Circle, Ellipse, Line, Polygon, Rect, Triangle, Path, FabricObject } from 'fabric';

// Shape category types
export type ShapeCategory = 'basic' | 'arrows' | 'callouts' | 'production' | 'flowchart';

export interface ShapeDefinition {
  id: string;
  name: string;
  category: ShapeCategory;
  icon: string; // SVG path or emoji for picker display
  create: (options?: any) => FabricObject;
}

// Basic shape creators
const createRect = (options?: any): FabricObject => {
  return new Rect({
    width: 150,
    height: 100,
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    ...options,
  });
};

const createCircle = (options?: any): FabricObject => {
  return new Circle({
    radius: 50,
    fill: '#10b981',
    stroke: '#047857',
    strokeWidth: 2,
    ...options,
  });
};

const createTriangle = (options?: any): FabricObject => {
  return new Triangle({
    width: 100,
    height: 100,
    fill: '#f59e0b',
    stroke: '#d97706',
    strokeWidth: 2,
    ...options,
  });
};

const createEllipse = (options?: any): FabricObject => {
  return new Ellipse({
    rx: 75,
    ry: 50,
    fill: '#8b5cf6',
    stroke: '#6d28d9',
    strokeWidth: 2,
    ...options,
  });
};

const createLine = (options?: any): FabricObject => {
  return new Line([0, 0, 150, 0], {
    stroke: '#374151',
    strokeWidth: 3,
    ...options,
  });
};

// Arrow creator using fabric.Path
const createArrow = (options?: any): FabricObject => {
  const arrowPath = 'M 0 10 L 100 10 L 100 0 L 130 15 L 100 30 L 100 20 L 0 20 Z';
  return new Path(arrowPath, {
    fill: '#374151',
    stroke: '#1f2937',
    strokeWidth: 1,
    ...options,
  });
};

const createDoubleArrow = (options?: any): FabricObject => {
  const path = 'M 30 0 L 0 15 L 30 30 L 30 20 L 100 20 L 100 30 L 130 15 L 100 0 L 100 10 L 30 10 Z';
  return new Path(path, {
    fill: '#374151',
    stroke: '#1f2937',
    strokeWidth: 1,
    ...options,
  });
};

// Callout shapes
const createCalloutRect = (options?: any): FabricObject => {
  const path = 'M 0 0 L 150 0 L 150 80 L 40 80 L 20 100 L 30 80 L 0 80 Z';
  return new Path(path, {
    fill: '#fef3c7',
    stroke: '#f59e0b',
    strokeWidth: 2,
    ...options,
  });
};

const createCalloutCloud = (options?: any): FabricObject => {
  const path = 'M 25 60 Q 0 60 0 40 Q 0 20 25 20 Q 25 0 50 0 Q 75 0 100 0 Q 125 0 125 20 Q 150 20 150 40 Q 150 60 125 60 L 40 60 L 20 80 L 35 60 Z';
  return new Path(path, {
    fill: '#ffffff',
    stroke: '#9ca3af',
    strokeWidth: 2,
    ...options,
  });
};

// Production-specific shapes
const createCameraIcon = (options?: any): FabricObject => {
  const path = 'M 23 20 L 17 8 L 7 8 L 1 20 L 1 35 L 23 35 Z M 12 28 A 5 5 0 1 0 12 18 A 5 5 0 1 0 12 28';
  return new Path(path, {
    fill: '#1f2937',
    stroke: '#000000',
    strokeWidth: 1,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

const createMicIcon = (options?: any): FabricObject => {
  const path = 'M 12 1 A 4 4 0 0 1 16 5 L 16 12 A 4 4 0 0 1 8 12 L 8 5 A 4 4 0 0 1 12 1 M 5 10 L 5 12 A 7 7 0 0 0 19 12 L 19 10 M 12 19 L 12 23 M 8 23 L 16 23';
  return new Path(path, {
    fill: 'transparent',
    stroke: '#1f2937',
    strokeWidth: 2,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

const createLightIcon = (options?: any): FabricObject => {
  const path = 'M 12 2 L 12 4 M 4.93 4.93 L 6.34 6.34 M 2 12 L 4 12 M 4.93 19.07 L 6.34 17.66 M 12 20 L 12 22 M 17.66 17.66 L 19.07 19.07 M 20 12 L 22 12 M 17.66 6.34 L 19.07 4.93 M 12 6 A 6 6 0 1 0 12 18 A 6 6 0 1 0 12 6';
  return new Path(path, {
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 1,
    scaleX: 4,
    scaleY: 4,
    ...options,
  });
};

// Flowchart shapes
const createDiamond = (options?: any): FabricObject => {
  const path = 'M 75 0 L 150 50 L 75 100 L 0 50 Z';
  return new Path(path, {
    fill: '#e0f2fe',
    stroke: '#0284c7',
    strokeWidth: 2,
    ...options,
  });
};

const createParallelogram = (options?: any): FabricObject => {
  const path = 'M 30 0 L 150 0 L 120 80 L 0 80 Z';
  return new Path(path, {
    fill: '#fce7f3',
    stroke: '#db2777',
    strokeWidth: 2,
    ...options,
  });
};

// Star shape
const createStar = (options?: any): FabricObject => {
  const points = [];
  const outerRadius = 50;
  const innerRadius = 25;

  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * radius + 50,
      y: Math.sin(angle) * radius + 50,
    });
  }

  return new Polygon(points, {
    fill: '#fbbf24',
    stroke: '#f59e0b',
    strokeWidth: 2,
    ...options,
  });
};

// All shape definitions
export const shapeDefinitions: ShapeDefinition[] = [
  // Basic shapes
  { id: 'rect', name: 'Rectangle', category: 'basic', icon: '▭', create: createRect },
  { id: 'circle', name: 'Circle', category: 'basic', icon: '○', create: createCircle },
  { id: 'triangle', name: 'Triangle', category: 'basic', icon: '△', create: createTriangle },
  { id: 'ellipse', name: 'Ellipse', category: 'basic', icon: '⬭', create: createEllipse },
  { id: 'line', name: 'Line', category: 'basic', icon: '─', create: createLine },
  { id: 'star', name: 'Star', category: 'basic', icon: '★', create: createStar },

  // Arrows
  { id: 'arrow', name: 'Arrow', category: 'arrows', icon: '→', create: createArrow },
  { id: 'double-arrow', name: 'Double Arrow', category: 'arrows', icon: '↔', create: createDoubleArrow },

  // Callouts
  { id: 'callout-rect', name: 'Callout', category: 'callouts', icon: '💬', create: createCalloutRect },
  { id: 'callout-cloud', name: 'Cloud', category: 'callouts', icon: '☁', create: createCalloutCloud },

  // Production icons
  { id: 'camera', name: 'Camera', category: 'production', icon: '📷', create: createCameraIcon },
  { id: 'mic', name: 'Microphone', category: 'production', icon: '🎤', create: createMicIcon },
  { id: 'light', name: 'Light', category: 'production', icon: '💡', create: createLightIcon },

  // Flowchart
  { id: 'diamond', name: 'Decision', category: 'flowchart', icon: '◇', create: createDiamond },
  { id: 'parallelogram', name: 'Input/Output', category: 'flowchart', icon: '▱', create: createParallelogram },
];

// Get shapes by category
export const getShapesByCategory = (category: ShapeCategory): ShapeDefinition[] => {
  return shapeDefinitions.filter(s => s.category === category);
};

// Get all categories
export const shapeCategories: { id: ShapeCategory; name: string }[] = [
  { id: 'basic', name: 'Basic Shapes' },
  { id: 'arrows', name: 'Arrows' },
  { id: 'callouts', name: 'Callouts' },
  { id: 'production', name: 'Production' },
  { id: 'flowchart', name: 'Flowchart' },
];
