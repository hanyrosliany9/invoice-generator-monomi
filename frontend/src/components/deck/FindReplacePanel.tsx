import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown, Replace } from 'lucide-react';
import { IText } from 'fabric';
import type { Canvas as FabricCanvas } from 'fabric';
import { toast } from 'sonner';
import type { DeckSlide, DeckSlideElement } from '@/types/deck';
import { elementsApi } from '@/services/decks';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FindReplacePanelProps {
  /** Whether the panel is visible */
  open: boolean;
  /** 'find' = find-only mode; 'replace' = find+replace mode */
  mode: 'find' | 'replace';
  /** All slides in the deck */
  slides: DeckSlide[];
  /** Setter for all slides (used when replacing on non-active slides) */
  setSlides: React.Dispatch<React.SetStateAction<DeckSlide[]>>;
  /** Index of the currently-active (canvas-mounted) slide */
  activeSlideIndex: number;
  /** Fabric canvas for the active slide */
  canvas: FabricCanvas | null;
  /** Switch the active slide (triggers flush + canvas reload) */
  onSelectSlide: (index: number) => void;
  /** Close the panel */
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Match record                                                        */
/* ------------------------------------------------------------------ */

interface Match {
  slideIndex: number;
  slideId: string;
  /** For active slide: fabric IText object reference; for others: element id */
  source: 'canvas' | 'element';
  /** The element id (for non-active slides) */
  elementId?: string;
  /** The element index in slide.elements (for non-active slides) */
  elementIndex?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Escape regex special characters in a user-supplied string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-aware replace for a single text value. Replaces ALL occurrences. */
function applyReplace(text: string, find: string, replace: string, matchCase: boolean): string {
  if (!find) return text;
  const flags = matchCase ? 'g' : 'gi';
  const re = new RegExp(escapeRegex(find), flags);
  return text.split(re).join(replace);
}

/** Count how many matches a text has for the find string. */
function countMatches(text: string, find: string, matchCase: boolean): number {
  if (!find) return 0;
  const flags = matchCase ? 'g' : 'gi';
  const re = new RegExp(escapeRegex(find), flags);
  return (text.match(re) ?? []).length;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function FindReplacePanel({
  open,
  mode,
  slides,
  setSlides,
  activeSlideIndex,
  canvas,
  onSelectSlide,
  onClose,
}: FindReplacePanelProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const findInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ---- Focus find input when panel opens ---- */
  useEffect(() => {
    if (open) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    }
  }, [open]);

  /* ---- Rebuild match list whenever find text, match case, slides, or canvas changes ---- */
  const buildMatches = useCallback((): Match[] => {
    if (!findText) return [];

    const result: Match[] = [];
    const activeSlideId = slides[activeSlideIndex]?.id;

    for (let si = 0; si < slides.length; si++) {
      const slide = slides[si];

      if (slide.id === activeSlideId && canvas) {
        // Active slide: read from live fabric canvas
        const objects = canvas.getObjects();
        for (const obj of objects) {
          if (obj instanceof IText) {
            const text = obj.text ?? '';
            const n = countMatches(text, findText, matchCase);
            for (let i = 0; i < n; i++) {
              result.push({ slideIndex: si, slideId: slide.id, source: 'canvas' });
            }
          }
        }
      } else {
        // Non-active slide: read from elements array
        for (let ei = 0; ei < slide.elements.length; ei++) {
          const el = slide.elements[ei];
          if (el.type !== 'TEXT') continue;
          const text = (el.content as any)?.text ?? '';
          const n = countMatches(text, findText, matchCase);
          for (let i = 0; i < n; i++) {
            result.push({
              slideIndex: si,
              slideId: slide.id,
              source: 'element',
              elementId: el.id,
              elementIndex: ei,
            });
          }
        }
      }
    }

    return result;
  }, [findText, matchCase, slides, activeSlideIndex, canvas]);

  /* Re-compute matches on deps change */
  useEffect(() => {
    const m = buildMatches();
    setMatches(m);
    // Clamp index
    setMatchIndex((prev) => (m.length > 0 ? Math.min(prev, m.length - 1) : 0));
  }, [buildMatches]);

  /* ---- Navigate to a specific match ---- */
  const navigateTo = useCallback(
    (idx: number) => {
      if (matches.length === 0) return;
      const m = matches[idx];
      if (!m) return;

      if (m.slideIndex !== activeSlideIndex) {
        // Switch slide; canvas will re-mount
        onSelectSlide(m.slideIndex);
      } else if (canvas) {
        // Highlight the first fabric IText with a match
        const objects = canvas.getObjects();
        for (const obj of objects) {
          if (obj instanceof IText) {
            if (countMatches(obj.text ?? '', findText, matchCase) > 0) {
              canvas.setActiveObject(obj);
              canvas.renderAll();
              break;
            }
          }
        }
      }
    },
    [matches, activeSlideIndex, onSelectSlide, canvas, findText, matchCase],
  );

  const handlePrev = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex - 1 + matches.length) % matches.length;
    setMatchIndex(next);
    navigateTo(next);
  }, [matches, matchIndex, navigateTo]);

  const handleNext = useCallback(() => {
    if (matches.length === 0) return;
    const next = (matchIndex + 1) % matches.length;
    setMatchIndex(next);
    navigateTo(next);
  }, [matches, matchIndex, navigateTo]);

  /* ---- Replace current match (single) ---- */
  const handleReplace = useCallback(async () => {
    if (matches.length === 0 || !findText) return;

    const m = matches[matchIndex];
    if (!m) return;

    if (m.source === 'canvas' && canvas) {
      // Active slide — update fabric IText objects
      const objects = canvas.getObjects();
      let replaced = false;
      for (const obj of objects) {
        if (obj instanceof IText) {
          const text = obj.text ?? '';
          if (countMatches(text, findText, matchCase) > 0) {
            const newText = applyReplace(text, findText, replaceText, matchCase);
            obj.set('text', newText);
            canvas.renderAll();
            canvas.fire('object:modified', { target: obj });
            replaced = true;
            break; // Replace only first matching object for "Replace" (single)
          }
        }
      }
      if (replaced) {
        // Rebuild matches after replacement
        const updated = buildMatches();
        setMatches(updated);
        setMatchIndex((prev) => Math.min(prev, Math.max(0, updated.length - 1)));
      }
    } else if (m.source === 'element' && m.elementId != null && m.elementIndex != null) {
      // Non-active slide — update in local state and persist
      const slide = slides[m.slideIndex];
      if (!slide) return;

      const el = slide.elements[m.elementIndex];
      if (!el || el.type !== 'TEXT') return;

      const oldText = (el.content as any)?.text ?? '';
      const newText = applyReplace(oldText, findText, replaceText, matchCase);

      const updatedElement: DeckSlideElement = {
        ...el,
        content: { ...(el.content as any), text: newText },
      };

      const updatedElements = slide.elements.map((e, i) =>
        i === m.elementIndex ? updatedElement : e,
      );
      const updatedSlide: DeckSlide = { ...slide, elements: updatedElements };

      setSlides((prev) => prev.map((s) => (s.id === slide.id ? updatedSlide : s)));

      // Persist to server
      setIsSaving(true);
      try {
        await elementsApi.bulkSaveForSlide(slide.id, updatedElements);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save replacement');
      } finally {
        setIsSaving(false);
      }

      const updated = buildMatches();
      setMatches(updated);
      setMatchIndex((prev) => Math.min(prev, Math.max(0, updated.length - 1)));
    }
  }, [matches, matchIndex, findText, replaceText, matchCase, canvas, slides, setSlides, buildMatches]);

  /* ---- Replace all matches ---- */
  const handleReplaceAll = useCallback(async () => {
    if (!findText) return;

    const activeSlideId = slides[activeSlideIndex]?.id;

    // 1. Replace in canvas (active slide)
    if (canvas) {
      const objects = canvas.getObjects();
      let anyReplaced = false;
      for (const obj of objects) {
        if (obj instanceof IText) {
          const text = obj.text ?? '';
          if (countMatches(text, findText, matchCase) > 0) {
            obj.set('text', applyReplace(text, findText, replaceText, matchCase));
            anyReplaced = true;
          }
        }
      }
      if (anyReplaced) {
        canvas.renderAll();
        // Fire on the first modified object so autosave triggers
        const first = canvas.getObjects().find((o) => o instanceof IText);
        if (first) canvas.fire('object:modified', { target: first });
      }
    }

    // 2. Replace in non-active slides — group by slide for bulk-save
    const affectedSlides: Map<string, DeckSlide> = new Map();

    for (const slide of slides) {
      if (slide.id === activeSlideId) continue; // Handled via canvas above
      let changed = false;
      const updatedElements = slide.elements.map((el) => {
        if (el.type !== 'TEXT') return el;
        const text = (el.content as any)?.text ?? '';
        if (countMatches(text, findText, matchCase) === 0) return el;
        changed = true;
        return {
          ...el,
          content: {
            ...(el.content as any),
            text: applyReplace(text, findText, replaceText, matchCase),
          },
        };
      });
      if (changed) {
        affectedSlides.set(slide.id, { ...slide, elements: updatedElements });
      }
    }

    if (affectedSlides.size > 0) {
      // Optimistic local update
      setSlides((prev) =>
        prev.map((s) => {
          const updated = affectedSlides.get(s.id);
          return updated ?? s;
        }),
      );

      // Persist all affected slides
      setIsSaving(true);
      try {
        await Promise.all(
          Array.from(affectedSlides.values()).map((slide) =>
            elementsApi.bulkSaveForSlide(slide.id, slide.elements),
          ),
        );
        toast.success(`Replaced all occurrences of "${findText}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save some replacements');
      } finally {
        setIsSaving(false);
      }
    }

    // Rebuild matches (should be 0 now)
    const updated = buildMatches();
    setMatches(updated);
    setMatchIndex(0);
  }, [findText, replaceText, matchCase, slides, activeSlideIndex, canvas, setSlides, buildMatches]);

  /* ---- Keyboard: Escape closes, Enter navigates ---- */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        if (e.shiftKey) handlePrev();
        else handleNext();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, handleNext, handlePrev]);

  if (!open) return null;

  const totalMatches = matches.length;
  const currentMatch = totalMatches > 0 ? matchIndex + 1 : 0;

  return (
    <div
      ref={panelRef}
      className="
        fixed top-16 right-4 z-50
        bg-bg-base border border-border-subtle rounded-lg shadow-2xl
        w-80 text-sm text-text-primary
        animate-in fade-in slide-in-from-top-2 duration-150
      "
      role="dialog"
      aria-label={mode === 'replace' ? 'Find and Replace' : 'Find'}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {mode === 'replace' ? 'Find & Replace' : 'Find'}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Find row */}
        <div className="flex items-center gap-1.5">
          <input
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find…"
            className="
              flex-1 h-7 px-2 text-xs rounded border border-border-default
              bg-bg-sunken text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:ring-1 focus:ring-brand-cream
            "
            aria-label="Find text"
          />
          {/* Match counter */}
          <span className="text-[10px] text-text-tertiary tabular-nums whitespace-nowrap min-w-[48px] text-right">
            {findText
              ? totalMatches === 0
                ? 'No results'
                : `${currentMatch} of ${totalMatches}`
              : ''}
          </span>
          {/* Prev */}
          <button
            onClick={handlePrev}
            disabled={totalMatches === 0}
            className="p-1 rounded text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Previous match (Shift+Enter)"
            aria-label="Previous match"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          {/* Next */}
          <button
            onClick={handleNext}
            disabled={totalMatches === 0}
            className="p-1 rounded text-text-tertiary hover:text-text-primary disabled:opacity-30 transition-colors"
            title="Next match (Enter)"
            aria-label="Next match"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Replace row (only in replace mode) */}
        {mode === 'replace' && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with…"
              className="
                flex-1 h-7 px-2 text-xs rounded border border-border-default
                bg-bg-sunken text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-1 focus:ring-brand-cream
              "
              aria-label="Replace with text"
            />
            <button
              onClick={() => void handleReplace()}
              disabled={totalMatches === 0 || isSaving}
              className="
                h-7 px-2 text-xs rounded border border-border-default
                text-text-secondary hover:text-text-primary hover:bg-bg-sunken
                disabled:opacity-30 transition-colors whitespace-nowrap
              "
              title="Replace current match"
            >
              Replace
            </button>
            <button
              onClick={() => void handleReplaceAll()}
              disabled={totalMatches === 0 || isSaving}
              className="
                h-7 px-2 text-xs rounded border border-border-default
                text-text-secondary hover:text-text-primary hover:bg-bg-sunken
                disabled:opacity-30 transition-colors whitespace-nowrap flex items-center gap-1
              "
              title="Replace all matches"
            >
              <Replace className="h-3 w-3" />
              All
            </button>
          </div>
        )}

        {/* Match-case toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer w-fit select-none">
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(e) => setMatchCase(e.target.checked)}
            className="h-3 w-3 accent-brand-cream"
          />
          <span className="text-[10px] text-text-tertiary">Match case</span>
        </label>

        {/* Slide context list — show which slides have matches */}
        {findText && totalMatches > 0 && (
          <div className="max-h-28 overflow-y-auto rounded border border-border-subtle divide-y divide-border-subtle">
            {Array.from(new Set(matches.map((m) => m.slideIndex))).map((si) => {
              const count = matches.filter((m) => m.slideIndex === si).length;
              const isActive = si === activeSlideIndex;
              return (
                <button
                  key={si}
                  onClick={() => onSelectSlide(si)}
                  className={`
                    w-full flex items-center justify-between px-2 py-1 text-[10px]
                    hover:bg-bg-sunken transition-colors text-left
                    ${isActive ? 'text-brand-cream font-medium' : 'text-text-secondary'}
                  `}
                >
                  <span>Slide {si + 1}</span>
                  <span className="text-text-tertiary tabular-nums">{count} match{count !== 1 ? 'es' : ''}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* No results hint */}
        {findText && totalMatches === 0 && (
          <p className="text-[10px] text-text-tertiary text-center py-1">
            No text matches found
          </p>
        )}
      </div>
    </div>
  );
}
