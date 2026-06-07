import React from 'react';
import { safeUrl } from '@/utils/safeUrl';
import type { DeckSlide } from '@/types/deck';

interface PresentSlideRendererProps {
  slide: DeckSlide;
  width: number;
  height: number;
}

/**
 * Renders a single slide from its persisted `content` + `elements` (the same
 * source of truth the public viewer and exporter read from), scaled to fill the
 * presentation stage. Element positions/sizes are percentages of the slide, so
 * positioning is resolution-independent.
 *
 * Kept deliberately close to the public viewer's slide renderer
 * (PublicDeckViewPage) so present mode and the public link show the same thing.
 */
export const PresentSlideRenderer: React.FC<PresentSlideRendererProps> = ({
  slide,
  width,
  height,
}) => {
  const { title, subtitle, content = {}, backgroundColor, backgroundImage, elements = [] } = slide;

  const body: string | undefined = content.body;
  const caption: string | undefined = content.caption;
  const leftContent: string | undefined = content.leftContent;
  const rightContent: string | undefined = content.rightContent;
  const items: string[] | undefined = Array.isArray(content.items) ? content.items : undefined;
  const images: { url?: string; caption?: string }[] | undefined = Array.isArray(content.images)
    ? content.images
    : undefined;

  const hasContent =
    !!title || !!subtitle || !!body || !!caption || !!leftContent || !!rightContent ||
    (items?.length ?? 0) > 0 || (images?.length ?? 0) > 0 || elements.length > 0;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ width, height, background: backgroundColor || '#ffffff' }}
    >
      {/* Background image — full bleed */}
      {safeUrl(backgroundImage) && (
        <img
          src={safeUrl(backgroundImage)}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          aria-hidden="true"
        />
      )}

      {/* Free-form elements: absolutely positioned by percentage */}
      {elements
        .slice()
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => {
          const elContent = el.content ?? {};
          return (
            <div
              key={el.id}
              style={{
                position: 'absolute',
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                transformOrigin: 'top left',
                zIndex: el.zIndex,
                pointerEvents: 'none',
              }}
            >
              {el.type === 'TEXT' && elContent.text && (
                <span
                  style={{
                    fontSize: elContent.fontSize ? `${elContent.fontSize}px` : '24px',
                    fontFamily: elContent.fontFamily || 'Inter, sans-serif',
                    fontWeight: elContent.fontWeight as any,
                    fontStyle: elContent.fontStyle as any,
                    color: elContent.fill || elContent.color || '#000000',
                    textAlign: elContent.textAlign as any,
                    textDecoration: [
                      elContent.underline ? 'underline' : '',
                      elContent.linethrough ? 'line-through' : '',
                    ].filter(Boolean).join(' ') || undefined,
                    whiteSpace: 'pre-wrap',
                    display: 'block',
                  }}
                >
                  {elContent.text}
                </span>
              )}

              {(el.type === 'IMAGE' || el.type === 'VIDEO') && safeUrl(elContent.url) && (
                <img
                  src={safeUrl(elContent.url)}
                  alt={elContent.alt ?? ''}
                  className="h-full w-full object-contain"
                />
              )}

              {el.type === 'SHAPE' && (
                <ShapeBox content={elContent} />
              )}
            </div>
          );
        })}

      {/* Template/content overlay — only when there's structured content. */}
      {hasContent && (title || subtitle || body || caption || leftContent || rightContent || items || images) && (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 p-12 text-center">
          {title && (
            <h2 className="font-display text-4xl font-semibold tracking-tight text-gray-900">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-xl text-gray-600">{subtitle}</p>}
          {(leftContent || rightContent) && (
            <div className="flex w-full max-w-4xl gap-8 text-left">
              {leftContent && <div className="flex-1 whitespace-pre-wrap text-base text-gray-700">{leftContent}</div>}
              {rightContent && <div className="flex-1 whitespace-pre-wrap text-base text-gray-700">{rightContent}</div>}
            </div>
          )}
          {body && <p className="max-w-3xl whitespace-pre-wrap text-base text-gray-700">{body}</p>}
          {caption && <p className="text-sm italic text-gray-500">{caption}</p>}
          {items && items.length > 0 && (
            <ul className="space-y-2 text-left text-base text-gray-700">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {images && images.length > 0 && (
            <div className="grid w-full max-w-4xl grid-cols-3 gap-3">
              {images.map((img, i) => safeUrl(img.url) && (
                <img key={i} src={safeUrl(img.url)} alt={img.caption ?? ''} className="h-full w-full rounded object-cover" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* Render a SHAPE element as a styled div approximation. */
function ShapeBox({ content }: { content: Record<string, any> }) {
  const shapeType = (content.shapeType as string) || 'RECT';
  const common: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: content.fill || '#e0e0e0',
    border: `${content.strokeWidth ?? 2}px solid ${content.stroke || '#333333'}`,
    boxSizing: 'border-box',
  };

  if (shapeType === 'CIRCLE' || shapeType === 'ELLIPSE') {
    return <div style={{ ...common, borderRadius: '50%' }} />;
  }
  if (shapeType === 'LINE') {
    return (
      <div
        style={{
          width: '100%',
          height: 0,
          borderTop: `${content.strokeWidth ?? 2}px solid ${content.stroke || '#333333'}`,
          marginTop: '50%',
        }}
      />
    );
  }
  return <div style={{ ...common, borderRadius: content.rx ? `${content.rx}px` : undefined }} />;
}

export default PresentSlideRenderer;
