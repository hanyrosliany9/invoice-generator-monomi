import * as React from 'react';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  /** The value stored in form state. */
  value: string;
  /** Plain-text label used for matching + the trigger display. */
  label: string;
  /** Extra terms to match against when searching (e.g. account code, English name). */
  keywords?: string[];
  /** Optional custom row rendering inside the dropdown (falls back to `label`). */
  node?: React.ReactNode;
  /** Disable selecting this row. */
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Class for the trigger button (match the surrounding field styling). */
  className?: string;
  /** Class for the dropdown content. */
  contentClassName?: string;
  id?: string;
  'aria-invalid'?: boolean;
  /** When set, renders a footer button (e.g. "+ New client") that closes the
   *  dropdown and invokes this — for inline creation of a missing entity. */
  onCreateNew?: () => void;
  createNewLabel?: string;
}

/**
 * A searchable single-select built on the Popover primitive — no extra deps.
 * Type to filter, ↑/↓ to move, Enter to pick, Esc to close. Styling mirrors
 * the v2 Select so it drops into the same forms.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  disabled,
  className,
  contentClassName,
  id,
  'aria-invalid': ariaInvalid,
  onCreateNew,
  createNewLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = [o.label, ...(o.keywords ?? [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  // Reset the active row whenever the filtered set changes.
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  // Keep the active row scrolled into view.
  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (opt?: ComboboxOption) => {
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(filtered[activeIndex]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-text-tertiary')}>
            {selected ? selected.node ?? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'w-(--radix-popover-trigger-width) p-0 bg-bg-raised border-border-subtle',
          contentClassName,
        )}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle px-3">
          <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
        <div ref={listRef} className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-text-tertiary">
              {emptyText}
            </div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                data-index={i}
                disabled={opt.disabled}
                onClick={() => commit(opt)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-text-primary transition-colors disabled:opacity-40',
                  i === activeIndex && 'bg-bg-sunken',
                )}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    opt.value === value ? 'opacity-100 text-brand-cream' : 'opacity-0',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{opt.node ?? opt.label}</span>
              </button>
            ))
          )}
        </div>
        {onCreateNew && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery('');
              onCreateNew();
            }}
            className="flex w-full items-center gap-2 border-t border-border-subtle px-3 py-2.5 text-left text-sm text-brand-cream hover:bg-bg-sunken transition-colors"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{createNewLabel ?? 'Add new'}</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
