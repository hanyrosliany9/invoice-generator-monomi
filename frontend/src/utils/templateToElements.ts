import type { SlideTemplate as SlideTemplateDef, TemplateElement } from '../templates/templateTypes';
import type { DeckSlideElement } from '../types/deck';

/**
 * Convert a slide template definition (1920×1080 fabric-style coordinates,
 * see templates/templateDefinitions.ts) into persistable DeckSlideElement
 * payloads for the bulk-save API.
 *
 * Storage conventions (must mirror fabricObjectToElement /
 * elementToFabricObject in deckCanvasUtils):
 * - x / y / width / height are PERCENTAGES of the slide.
 * - TEXT content.fontSize is in pixels of the current editor canvas
 *   (deckWidth × getCanvasScale), so pass that canvas size in.
 * - Placeholders persist as IMAGE elements with { placeholder: label }.
 * - Shapes persist as { shapeType: 'RECT' | 'CIRCLE' | 'LINE', ... }.
 */

const TEMPLATE_W = 1920;
const TEMPLATE_H = 1080;

export function templateToElements(
  template: SlideTemplateDef,
  canvasWidth: number,
): Array<Partial<DeckSlideElement>> {
  const fontScale = canvasWidth / TEMPLATE_W;

  return template.elements
    .map((el, index) => convertElement(el, index, fontScale))
    .filter((el): el is Partial<DeckSlideElement> => el !== null);
}

function convertElement(
  el: TemplateElement,
  zIndex: number,
  fontScale: number,
): Partial<DeckSlideElement> | null {
  const props = el.properties as Record<string, any>;
  const box = resolveBox(el);
  if (!box) return null;

  const base = {
    x: pct(box.left, TEMPLATE_W),
    y: pct(box.top, TEMPLATE_H),
    width: Math.max(pct(box.width, TEMPLATE_W), 0.5),
    height: Math.max(pct(box.height, TEMPLATE_H), 0.5),
    rotation: props.angle || 0,
    zIndex,
  };

  switch (el.type) {
    case 'text':
      return {
        ...base,
        type: 'TEXT',
        content: {
          text: props.text ?? 'Text',
          fontSize: Math.max(8, Math.round((props.fontSize ?? 24) * fontScale)),
          fontFamily: props.fontFamily ?? 'Inter, sans-serif',
          fontWeight: props.fontWeight ?? 'normal',
          fontStyle: props.fontStyle ?? 'normal',
          fill: props.fill ?? '#000000',
          textAlign: props.textAlign ?? 'left',
          underline: props.underline ?? false,
          linethrough: props.linethrough ?? false,
        },
      };

    case 'placeholder':
      return {
        ...base,
        type: 'IMAGE',
        content: { placeholder: props.placeholder || 'Image' },
      };

    case 'shape': {
      const shapeType =
        props.shapeType === 'circle' ? 'CIRCLE'
        : props.shapeType === 'line' ? 'LINE'
        : 'RECT';
      return {
        ...base,
        type: 'SHAPE',
        content: {
          shapeType,
          fill: props.fill ?? '#e0e0e0',
          stroke: props.stroke ?? 'transparent',
          strokeWidth: props.strokeWidth ?? 0,
          rx: props.rx,
          ry: props.ry,
        },
      };
    }

    // 'image' template elements are unused (the renderer skipped them too).
    default:
      return null;
  }
}

/**
 * Resolve an element's top-left box in template space, accounting for
 * fabric origin offsets ('center' / 'right' / 'bottom'). Text elements have
 * no explicit width/height — fabric auto-sizes them — so estimate a box from
 * the text metrics; the editor ignores stored TEXT width/height on load, the
 * estimate only feeds origin math and the static renderers.
 */
function resolveBox(
  el: TemplateElement,
): { left: number; top: number; width: number; height: number } | null {
  const props = el.properties as Record<string, any>;
  let { width, height } = props;

  if (props.radius != null) {
    // fabric Circle: sized by radius
    width = props.radius * 2;
    height = props.radius * 2;
  }

  if (el.type === 'text') {
    const text: string = props.text ?? 'Text';
    const fontSize: number = props.fontSize ?? 24;
    const lines = text.split('\n');
    const maxLine = Math.max(...lines.map((l) => l.length), 1);
    width = width ?? maxLine * fontSize * 0.55;
    height = height ?? lines.length * fontSize * 1.35;
  }

  if (width == null || height == null) return null;

  let left: number = props.left ?? 0;
  let top: number = props.top ?? 0;
  if (props.originX === 'center') left -= width / 2;
  else if (props.originX === 'right') left -= width;
  if (props.originY === 'center') top -= height / 2;
  else if (props.originY === 'bottom') top -= height;

  return { left, top, width, height };
}

function pct(value: number, total: number): number {
  return Math.round((value / total) * 10000) / 100;
}
