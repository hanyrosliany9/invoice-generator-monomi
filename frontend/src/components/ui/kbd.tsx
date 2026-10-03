import { type ComponentProps, type ReactElement, type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ariaKeyShortcuts,
  comboLabels,
  detectPlatform,
  formatKeys,
  getShortcut,
  type KeyCombo,
  type Platform,
} from '@/shortcuts/registry';

let cachedPlatform: Platform | undefined;
/** Mac or Windows/Linux, detected once per page load. */
export const usePlatform = (): Platform => {
  cachedPlatform ??= detectPlatform();
  return cachedPlatform;
};

/** Translated "Click / Scroll / Drag" words for key labels. */
export const useKeyWords = (): Record<string, string> => {
  const { t } = useTranslation();
  return useMemo(
    () => ({ Click: t('shortcuts.keys.Click'), Scroll: t('shortcuts.keys.Scroll'), Drag: t('shortcuts.keys.Drag') }),
    [t],
  );
};

type KbdTone = 'default' | 'dark';

const TONES: Record<KbdTone, string> = {
  default: 'border-border-default bg-bg-sunken text-text-secondary',
  dark: 'border-white/25 bg-white/10 text-white/90',
};

export interface KbdProps extends ComponentProps<'kbd'> {
  tone?: KbdTone;
}

/** One key cap. */
export function Kbd({ className, tone = 'default', ...props }: KbdProps): ReactElement {
  return (
    <kbd
      className={cn(
        'inline-flex h-[1.4rem] min-w-[1.4rem] items-center justify-center whitespace-nowrap rounded-[5px] border px-1.5',
        'font-mono text-[11px] font-medium leading-none shadow-[0_1px_0_rgb(0_0_0/0.25)]',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export interface KeyComboViewProps {
  combo: KeyCombo;
  tone?: KbdTone;
  className?: string;
}

/** A combo as separate key caps (Ctrl + Shift + Z), or glued on macOS (⌘ ⇧ Z). */
export function KeyComboView({ combo, tone, className }: KeyComboViewProps): ReactElement {
  const platform = usePlatform();
  const words = useKeyWords();
  const labels = comboLabels(combo, platform, words);
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {labels.map((l, i) => (
        <Kbd key={`${l}-${i}`} tone={tone}>{l}</Kbd>
      ))}
    </span>
  );
}

export interface ShortcutKeysProps {
  /** Shortcut id from the registry. */
  id: string;
  tone?: KbdTone;
  className?: string;
  /** Show only the first alternative (compact hints). */
  first?: boolean;
}

/** All alternatives of a registry shortcut: [Ctrl][K]  or  [Space] / [K]. */
export function ShortcutKeys({ id, tone, className, first = false }: ShortcutKeysProps): ReactElement {
  const { t } = useTranslation();
  const keys = first ? getShortcut(id).keys.slice(0, 1) : getShortcut(id).keys;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-1.5 gap-y-1', className)}>
      {keys.map((combo, i) => (
        <span key={combo.join('+')} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-[11px] text-text-tertiary" aria-label={t('shortcuts.ui.or')}>/</span>}
          <KeyComboView combo={combo} tone={tone} />
        </span>
      ))}
    </span>
  );
}

/** "Zoom in (+)" as plain text, for aria-labels and native titles. */
export function shortcutText(label: string, id: string, platform: Platform = detectPlatform()): string {
  return `${label} (${formatKeys(getShortcut(id).keys.slice(0, 2), platform)})`;
}

interface HintProps {
  label: ReactNode;
  id: string;
  tone?: KbdTone;
}

/** Tooltip body: label followed by the key caps. */
export function ShortcutHint({ label, id, tone = 'default' }: HintProps): ReactElement {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <ShortcutKeys id={id} tone={tone} first />
    </span>
  );
}

export interface ShortcutTipProps {
  label: ReactNode;
  /** Registry id of the shortcut the button triggers. */
  shortcut: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Extra classes for the bubble (lightbox needs a higher z-index). */
  contentClassName?: string;
  children: ReactElement;
}

/**
 * Wraps a button in a tooltip that names its shortcut and marks the button
 * with aria-keyshortcuts. Works on dark overlays via the `dark` styling of
 * `contentClassName`.
 */
export function ShortcutTip({ label, shortcut, side = 'bottom', contentClassName, children }: ShortcutTipProps): ReactElement {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild aria-keyshortcuts={ariaKeyShortcuts(shortcut)}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className={contentClassName}>
          <ShortcutHint label={label} id={shortcut} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
