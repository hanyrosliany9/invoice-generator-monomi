import { type ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';

export interface TopbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
  /** When provided a hamburger button is rendered at the leading edge, visible only at <md breakpoint. */
  onMenuClick?: () => void;
}

export const Topbar = ({ left, center, right, className, onMenuClick }: TopbarProps) => (
  <header className={cn(
    'sticky top-0 z-20 h-14 px-5 sm:px-8',
    'flex items-center justify-between gap-6',
    // Glassmorphism — sits over the parallax bg; thinner alpha + heavier
    // blur + saturation lets the moonbeam glow through.
    'bg-bg-base/40 backdrop-blur-2xl backdrop-saturate-[1.8]',
    'border-b border-border-subtle',
    className,
  )}>
    <div className="flex-1 min-w-0 flex items-center gap-2">
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      {left}
    </div>
    {center && <div className="flex items-center">{center}</div>}
    <div className="flex items-center gap-3">
      {/* ⌘K affordance hint — subtle button that reminds users of the
       * global command palette shortcut. Clicking it fires Ctrl-K so the
       * palette's own keydown handler picks it up. */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        aria-label="Open command palette (Ctrl+K)"
        className="hidden sm:flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-raised/60 px-2.5 py-1 text-xs text-text-tertiary hover:text-text-secondary hover:bg-bg-raised transition-colors"
      >
        <Search className="h-3 w-3" />
        <span className="hidden md:inline">Search…</span>
        <kbd className="ml-1 font-mono opacity-60">⌘K</kbd>
      </button>
      {/* Global LanguageSwitcher — appears on every v2 page automatically so
       * we don't have to wire it into 88 page-level topbar props. Persists
       * choice to localStorage via i18next-browser-languagedetector. */}
      <LanguageSwitcher />
      {right}
    </div>
  </header>
);
