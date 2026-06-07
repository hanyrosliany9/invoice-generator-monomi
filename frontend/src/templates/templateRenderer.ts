import { Canvas, IText, Rect, Circle, Line, Group, Text, Image } from 'fabric';
import { SlideTemplate, TemplateElement } from './templateTypes';

export const renderTemplateToCanvas = (
  canvas: Canvas,
  template: SlideTemplate
): void => {
  // Clear existing objects
  canvas.clear();

  // Set background color
  if (template.backgroundColor) {
    canvas.backgroundColor = template.backgroundColor;
    canvas.renderAll();
  }

  // Render each element
  template.elements.forEach((element) => {
    const obj = createFabricObject(element);
    if (obj) {
      canvas.add(obj);
    }
  });

  canvas.renderAll();
};

const createFabricObject = (element: TemplateElement): any | null => {
  const { type, id, properties } = element;

  let obj: any;

  switch (type) {
    case 'text':
      obj = new IText(properties.text || 'Text', {
        ...properties,
      });
      break;

    case 'placeholder':
      // Create a placeholder rectangle with label
      const group = createPlaceholder(element);
      return group;

    case 'shape':
      obj = createShape(element);
      if (!obj) return null;
      break;

    case 'image':
      // Images need async loading, skip for now
      return null;

    default:
      return null;
  }

  // Add element ID for reference
  (obj as any).templateElementId = id;
  (obj as any).elementType = type;

  return obj;
};

const createPlaceholder = (element: TemplateElement): Group => {
  const { properties } = element;
  const { left, top, width, height, placeholder, placeholderType } = properties as any;

  // Background rect
  const rect = new Rect({
    width,
    height,
    fill: '#f9fafb',
    stroke: '#d1d5db',
    strokeWidth: 2,
    strokeDashArray: [8, 4],
    rx: 8,
    ry: 8,
  });

  // Icon based on type
  const iconText = placeholderType === 'image' ? '🖼️' : 'T';
  const icon = new Text(iconText, {
    fontSize: 48,
    fill: '#9ca3af',
    originX: 'center',
    originY: 'center',
    left: width / 2,
    top: height / 2 - 20,
  });

  // Label
  const label = new Text(placeholder || 'Placeholder', {
    fontSize: 14,
    fill: '#6b7280',
    originX: 'center',
    originY: 'center',
    left: width / 2,
    top: height / 2 + 30,
  });

  const group = new Group([rect, icon, label], {
    left,
    top,
  });

  (group as any).templateElementId = element.id;
  (group as any).elementType = 'placeholder';
  (group as any).placeholderType = placeholderType;

  return group;
};

const createShape = (element: TemplateElement): any | null => {
  const { properties } = element;
  const shapeType = (properties as any).shapeType || 'rect';

  switch (shapeType) {
    case 'rect':
      return new Rect(properties as any);
    case 'circle':
      return new Circle(properties as any);
    case 'line':
      return new Line([0, 0, (properties.width || 100) as number, 0], properties as any);
    default:
      return new Rect(properties as any);
  }
};

// Helper to replace placeholder with actual image
export const replacePlaceholder = (
  canvas: Canvas,
  placeholderId: string,
  imageUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const objects = canvas.getObjects();
    const placeholder = objects.find(
      (obj) => (obj as any).templateElementId === placeholderId
    );

    if (!placeholder) {
      reject(new Error(`Placeholder ${placeholderId} not found`));
      return;
    }

    Image.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
        if (!img) {
          reject(new Error('Failed to load image'));
          return;
        }

        // Scale to fit placeholder bounds
        const bounds = placeholder.getBoundingRect();
        const scaleX = bounds.width / ((img.width || 1) as number);
        const scaleY = bounds.height / ((img.height || 1) as number);
        const scale = Math.min(scaleX, scaleY);

        img.set({
          left: bounds.left,
          top: bounds.top,
          scaleX: scale,
          scaleY: scale,
        });

        (img as any).templateElementId = placeholderId;
        (img as any).elementType = 'image';

        canvas.remove(placeholder);
        canvas.add(img);
        canvas.renderAll();
        resolve();
      }).catch(reject);
  });
};
