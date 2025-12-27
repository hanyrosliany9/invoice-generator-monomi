import {
  Canvas as FabricCanvas,
  IText,
  Rect,
  Circle,
  FabricImage,
  FabricObject,
  Triangle,
  Line,
  Polygon,
  Ellipse,
  Path,
} from 'fabric';
import type { DeckSlideElement } from '../types/deck';

// Generate unique ID
export const generateElementId = (): string => {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert percentage to canvas pixels
export const percentToPixel = (percent: number, total: number): number => {
  return (percent / 100) * total;
};

// Convert canvas pixels to percentage
export const pixelToPercent = (pixel: number, total: number): number => {
  return (pixel / total) * 100;
};

// Create interactive text object (double-click to edit)
export const createTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  const textObj = new IText(text, {
    left: 100,
    top: 100,
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    fill: '#000000',
    editable: true,
    ...options,
  });
  textObj.set('id', options.id || generateElementId());
  textObj.set('elementType', 'TEXT');
  return textObj;
};

// Create heading text (larger, bold)
export const createHeadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 48,
    fontWeight: 'bold',
    ...options,
  });
};

// Create subheading text
export const createSubheadingObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 32,
    fontWeight: '500',
    fill: '#666666',
    ...options,
  });
};

// Create body text
export const createBodyTextObject = (
  text: string,
  options: Partial<IText> & { id?: string } = {}
): IText => {
  return createTextObject(text, {
    fontSize: 18,
    fontWeight: 'normal',
    ...options,
  });
};

// Create rectangle
export const createRectObject = (
  options: Partial<Rect> & { id?: string } = {}
): Rect => {
  const rect = new Rect({
    left: 100,
    top: 100,
    width: 200,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
    ...options,
  });
  rect.set('id', options.id || generateElementId());
  rect.set('elementType', 'SHAPE');
  return rect;
};

// Create circle
export const createCircleObject = (
  options: Partial<Circle> & { id?: string } = {}
): Circle => {
  const circle = new Circle({
    left: 100,
    top: 100,
    radius: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  circle.set('id', options.id || generateElementId());
  circle.set('elementType', 'SHAPE');
  return circle;
};

// Create triangle
export const createTriangleObject = (
  options: Partial<Triangle> & { id?: string } = {}
): Triangle => {
  const triangle = new Triangle({
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  triangle.set('id', options.id || generateElementId());
  triangle.set('elementType', 'SHAPE');
  return triangle;
};

// Create line
export const createLineObject = (
  points: [number, number, number, number] = [0, 0, 200, 0],
  options: Partial<Line> & { id?: string } = {}
): Line => {
  const line = new Line(points, {
    stroke: '#333333',
    strokeWidth: 3,
    ...options,
  });
  line.set('id', options.id || generateElementId());
  line.set('elementType', 'SHAPE');
  line.set('shapeType', 'LINE');
  return line;
};

// Create ellipse
export const createEllipseObject = (
  options: Partial<Ellipse> & { id?: string } = {}
): Ellipse => {
  const ellipse = new Ellipse({
    left: 100,
    top: 100,
    rx: 80,
    ry: 50,
    fill: '#e0e0e0',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });
  ellipse.set('id', options.id || generateElementId());
  ellipse.set('elementType', 'SHAPE');
  ellipse.set('shapeType', 'ELLIPSE');
  return ellipse;
};

// Create arrow (using Path)
export const createArrowObject = (
  options: { id?: string; direction?: 'right' | 'left' | 'up' | 'down' } = {}
): Path => {
  // Right-pointing arrow path
  const arrowPath = 'M 0 20 L 60 20 L 60 10 L 80 25 L 60 40 L 60 30 L 0 30 Z';

  const arrow = new Path(arrowPath, {
    left: 100,
    top: 100,
    fill: '#333333',
    stroke: '#333333',
    strokeWidth: 1,
  });

  // Rotate based on direction
  if (options.direction === 'left') arrow.rotate(180);
  if (options.direction === 'up') arrow.rotate(-90);
  if (options.direction === 'down') arrow.rotate(90);

  arrow.set('id', options.id || generateElementId());
  arrow.set('elementType', 'SHAPE');
  arrow.set('shapeType', 'ARROW');
  return arrow;
};

// Create star shape
export const createStarObject = (
  options: { id?: string; points?: number } = {}
): Polygon => {
  const points = options.points || 5;
  const outerRadius = 50;
  const innerRadius = 25;
  const starPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    starPoints.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    });
  }

  const star = new Polygon(starPoints, {
    left: 100,
    top: 100,
    fill: '#ffd700',
    stroke: '#333333',
    strokeWidth: 2,
  });

  star.set('id', options.id || generateElementId());
  star.set('elementType', 'SHAPE');
  star.set('shapeType', 'STAR');
  return star;
};

// Create callout/speech bubble
export const createCalloutObject = (
  options: Partial<Path> & { id?: string } = {}
): Path => {
  // Rounded rectangle with pointer
  const calloutPath = `
    M 10 0
    L 140 0
    Q 150 0 150 10
    L 150 60
    Q 150 70 140 70
    L 40 70
    L 20 90
    L 30 70
    L 10 70
    Q 0 70 0 60
    L 0 10
    Q 0 0 10 0
    Z
  `;

  const callout = new Path(calloutPath, {
    left: 100,
    top: 100,
    fill: '#ffffff',
    stroke: '#333333',
    strokeWidth: 2,
    ...options,
  });

  callout.set('id', options.id || generateElementId());
  callout.set('elementType', 'SHAPE');
  callout.set('shapeType', 'CALLOUT');
  return callout;
};

// Create horizontal line
export const createHorizontalLineObject = (
  width: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, width, 0], options);
};

// Create vertical line
export const createVerticalLineObject = (
  height: number = 200,
  options: Partial<Line> & { id?: string } = {}
): Line => {
  return createLineObject([0, 0, 0, height], options);
};

// Create image from URL
export const createImageObject = async (
  url: string,
  options: { id?: string; maxWidth?: number; maxHeight?: number } = {}
): Promise<FabricImage> => {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });

  // Scale to fit max dimensions
  if (options.maxWidth && img.width && img.width > options.maxWidth) {
    img.scaleToWidth(options.maxWidth);
  }
  if (options.maxHeight && img.height && img.height > options.maxHeight) {
    img.scaleToHeight(options.maxHeight);
  }

  img.set('id', options.id || generateElementId());
  img.set('elementType', 'IMAGE');
  img.set('left', 100);
  img.set('top', 100);

  return img;
};

// Convert Fabric object to DeckSlideElement for saving
export const fabricObjectToElement = (
  obj: FabricObject,
  slideId: string,
  canvasWidth: number,
  canvasHeight: number
): Partial<DeckSlideElement> => {
  const left = obj.left || 0;
  const top = obj.top || 0;
  const width = obj.getScaledWidth();
  const height = obj.getScaledHeight();
  const angle = obj.angle || 0;

  const base = {
    x: pixelToPercent(left, canvasWidth),
    y: pixelToPercent(top, canvasHeight),
    width: pixelToPercent(width, canvasWidth),
    height: pixelToPercent(height, canvasHeight),
    rotation: angle,
    zIndex: obj.get('zIndex') || 0,
  };

  const elementType = obj.get('elementType') as string;

  if (elementType === 'TEXT' && obj instanceof IText) {
    return {
      ...base,
      type: 'TEXT',
      content: {
        text: obj.text,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        fontWeight: obj.fontWeight,
        fontStyle: obj.fontStyle,
        fill: obj.fill,
        textAlign: obj.textAlign,
        underline: obj.underline,
        linethrough: obj.linethrough,
      },
    };
  }

  if (elementType === 'IMAGE' && obj instanceof FabricImage) {
    return {
      ...base,
      type: 'IMAGE',
      content: {
        url: obj.getSrc(),
      },
    };
  }

  if (elementType === 'SHAPE') {
    let shapeType = obj.get('shapeType') || 'RECT';

    return {
      ...base,
      type: 'SHAPE',
      content: {
        shapeType,
        fill: obj.get('fill'),
        stroke: obj.get('stroke'),
        strokeWidth: obj.get('strokeWidth'),
        rx: obj.get('rx'),
        ry: obj.get('ry'),
      },
    };
  }

  return base;
};

// Load DeckSlideElement to Fabric object
export const elementToFabricObject = async (
  element: DeckSlideElement,
  canvasWidth: number,
  canvasHeight: number
): Promise<FabricObject | null> => {
  const left = percentToPixel(element.x, canvasWidth);
  const top = percentToPixel(element.y, canvasHeight);
  const width = percentToPixel(element.width, canvasWidth);
  const height = percentToPixel(element.height, canvasHeight);

  const baseOptions = {
    id: element.id,
    left,
    top,
    angle: element.rotation || 0,
  };

  if (element.type === 'TEXT') {
    const content = element.content as any;
    const text = createTextObject(content.text || 'Text', {
      ...baseOptions,
      fontSize: content.fontSize || 24,
      fontFamily: content.fontFamily || 'Inter, sans-serif',
      fontWeight: content.fontWeight || 'normal',
      fontStyle: content.fontStyle || 'normal',
      fill: content.fill || '#000000',
      textAlign: content.textAlign || 'left',
      underline: content.underline || false,
      linethrough: content.linethrough || false,
    });
    return text;
  }

  if (element.type === 'IMAGE' || element.type === 'image') {
    const content = element.content as any;

    console.log('[elementToFabricObject] Loading IMAGE element:', {
      elementId: element.id,
      contentType: typeof content,
      contentKeys: Object.keys(content || {}),
      content: JSON.stringify(content),
      hasUrl: !!content?.url,
      hasPlaceholder: !!content?.placeholder,
    });

    // Handle placeholder elements (saved as IMAGE type with placeholder content)
    if (content.placeholder) {
      console.log('[elementToFabricObject] Loading placeholder element:', element.id);
      const rect = createRectObject({
        ...baseOptions,
        width,
        height,
        fill: '#f9fafb',
        stroke: '#d1d5db',
        strokeWidth: 2,
        rx: 8,
        ry: 8,
      });
      rect.set('id', element.id);
      rect.set('elementType', 'placeholder');
      rect.set('placeholder', content.placeholder);
      return rect;
    }

    if (content.url) {
      console.log('[elementToFabricObject] Loading image from URL:', content.url);
      try {
        const img = await createImageObject(content.url, { id: element.id });
        img.set('left', left);
        img.set('top', top);
        img.scaleToWidth(width);
        console.log('[elementToFabricObject] Successfully loaded image:', element.id);
        return img;
      } catch (e) {
        console.error('[elementToFabricObject] Failed to load image from URL:', {
          elementId: element.id,
          url: content.url,
          error: e,
        });
        // Return placeholder rect on error
        const placeholder = createRectObject({
          ...baseOptions,
          width,
          height,
          fill: '#f0f0f0',
          stroke: '#cccccc',
        });
        placeholder.set('elementType', 'IMAGE_PLACEHOLDER');
        return placeholder;
      }
    }

    console.log('[elementToFabricObject] IMAGE element has no url or placeholder, returning null:', {
      elementId: element.id,
      content: JSON.stringify(content),
    });
    return null;
  }

  if (element.type === 'SHAPE') {
    const content = element.content as any;
    const shapeType = content.shapeType || 'RECT';
    const shapeOptions = {
      ...baseOptions,
      fill: content.fill || '#e0e0e0',
      stroke: content.stroke || '#333333',
      strokeWidth: content.strokeWidth || 2,
    };

    switch (shapeType) {
      case 'CIRCLE':
        return createCircleObject({ ...shapeOptions, radius: Math.min(width, height) / 2 });
      case 'ELLIPSE':
        return createEllipseObject({ ...shapeOptions, rx: width / 2, ry: height / 2 });
      case 'TRIANGLE':
        return createTriangleObject({ ...shapeOptions, width, height });
      case 'LINE':
        return createLineObject([0, 0, width, 0], shapeOptions);
      case 'ARROW':
        return createArrowObject(shapeOptions);
      case 'STAR':
        return createStarObject(shapeOptions);
      case 'CALLOUT':
        return createCalloutObject(shapeOptions);
      case 'RECT':
      default:
        return createRectObject({
          ...shapeOptions,
          width,
          height,
          rx: content.rx || 0,
          ry: content.ry || 0,
        });
    }
  }

  if (element.type === 'VIDEO') {
    // Videos are represented as image placeholders with play icon
    const content = element.content as any;
    const placeholder = createRectObject({
      ...baseOptions,
      width,
      height,
      fill: '#1a1a1a',
      stroke: '#333333',
    });
    placeholder.set('elementType', 'VIDEO');
    placeholder.set('videoUrl', content.url);
    return placeholder;
  }

  return null;
};
