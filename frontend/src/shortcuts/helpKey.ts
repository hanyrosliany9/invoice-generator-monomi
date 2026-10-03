/** Custom event the "?" buttons and hints dispatch to open the shortcuts overlay. */
export const SHORTCUTS_HELP_EVENT = 'monomi:shortcuts-help';

/** Set on <html> while the overlay is open so other global key handlers can stand down. */
export const SHORTCUTS_OPEN_ATTR = 'data-shortcuts-open';

export const openShortcutsHelp = (): void => {
  window.dispatchEvent(new CustomEvent(SHORTCUTS_HELP_EVENT));
};

/** True when the keystroke is going into something the user is typing in. */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], .ProseMirror') !== null;
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat' | 'defaultPrevented' | 'target'>;

/**
 * Should this keydown open the shortcuts overlay? "?" (Shift+/ on most
 * layouts) with no Ctrl/Cmd/Alt, outside inputs, textareas, selects,
 * contenteditable regions and rich-text/canvas editors.
 */
export function shouldOpenHelp(e: KeyLike, activeElement: Element | null = typeof document === 'undefined' ? null : document.activeElement): boolean {
  if (e.key !== '?') return false;
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return false;
  if (isEditableTarget(e.target) || isEditableTarget(activeElement)) return false;
  return true;
}
