import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { slidesApi } from '@/services/decks';
import type { DeckSlide } from '@/types/deck';

interface SpeakerNotesPanelProps {
  /** The currently active slide, or null if none is selected */
  activeSlide: DeckSlide | null;
  /** Update the local slides state so the note is reflected immediately */
  onNotesChange: (slideId: string, notes: string) => void;
  /** Whether the panel is shown (controlled externally via toolbar button) */
  open: boolean;
  onToggle: () => void;
}

const DEBOUNCE_MS = 800;

/**
 * Collapsible speaker-notes editor panel.
 * - Binds to the active slide's `notes` field.
 * - Debounces API saves via slidesApi.update({ notes }) to avoid excessive
 *   network calls while typing.
 * - Calls onNotesChange optimistically so the local state stays in sync with
 *   the canvas autosave pattern.
 */
const SpeakerNotesPanel: React.FC<SpeakerNotesPanelProps> = ({
  activeSlide,
  onNotesChange,
  open,
  onToggle,
}) => {
  const { t } = useTranslation();

  // Local textarea value — kept in sync with the active slide whenever it changes.
  const [localNotes, setLocalNotes] = useState(activeSlide?.notes ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSlideIdRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);

  // When the active slide changes, flush any pending save for the *previous*
  // slide and load the new slide's notes.
  useEffect(() => {
    const newId = activeSlide?.id ?? null;
    if (newId !== lastSlideIdRef.current) {
      // Flush pending debounce for the slide being left
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setLocalNotes(activeSlide?.notes ?? '');
      lastSlideIdRef.current = newId;
    }
  }, [activeSlide?.id, activeSlide?.notes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalNotes(value);

    // Propagate optimistically so slide-switch flushing sees the latest value.
    if (activeSlide?.id) {
      onNotesChange(activeSlide.id, value);
    }

    // Debounce the API save.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!activeSlide?.id) return;

    const slideId = activeSlide.id;
    debounceRef.current = setTimeout(async () => {
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;
      try {
        await slidesApi.update(slideId, { notes: value });
      } catch {
        // Non-critical — the note is still in local state; user can retry.
      } finally {
        saveInFlightRef.current = false;
      }
    }, DEBOUNCE_MS);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      className="shrink-0 border-t border-border-subtle bg-bg-base"
      style={{ transition: 'height 0.15s ease' }}
    >
      {/* Header / toggle row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-text-tertiary hover:text-text-secondary hover:bg-bg-sunken transition-colors"
      >
        <FileText className="h-3 w-3 shrink-0" />
        <span className="font-medium uppercase tracking-wide">
          {t('deckEditor.speakerNotes', 'Speaker Notes')}
        </span>
        {open
          ? <ChevronDown className="h-3 w-3 ml-auto" />
          : <ChevronUp className="h-3 w-3 ml-auto" />}
      </button>

      {/* Notes textarea — only rendered when open */}
      {open && (
        <div className="px-4 pb-3">
          <textarea
            value={localNotes}
            onChange={handleChange}
            disabled={!activeSlide}
            placeholder={
              activeSlide
                ? t('deckEditor.notesPlaceholder', 'Add speaker notes for this slide…')
                : t('deckEditor.noSlideSelected', 'Select a slide to edit its notes')
            }
            rows={4}
            className={[
              'w-full resize-none rounded border text-sm leading-relaxed',
              'bg-bg-sunken border-border-subtle text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-1 focus:ring-brand-cream focus:border-brand-cream',
              'px-3 py-2',
              !activeSlide ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          />
        </div>
      )}
    </div>
  );
};

export default SpeakerNotesPanel;
