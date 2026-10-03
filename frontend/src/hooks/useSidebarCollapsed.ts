import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'monomi.sidebar.collapsed';

const read = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], .ProseMirror') !== null
  );
};

/**
 * Desktop sidebar collapsed state, remembered per browser, with a Ctrl/Cmd+B
 * toggle. `enabled` should be true only where the toggle is actually shown
 * (desktop) so the shortcut is inert on tablet/mobile.
 */
export const useSidebarCollapsed = (enabled: boolean) => {
  const [collapsed, setCollapsed] = useState<boolean>(read);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* storage unavailable — keep in-memory state only */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.repeat) return;
      if (e.key.toLowerCase() !== 'b' || e.defaultPrevented) return;
      if (isEditable(e.target) || isEditable(document.activeElement)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, toggle]);

  return [collapsed, toggle] as const;
};
