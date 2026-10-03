import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ShortcutKeys } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { groupShortcuts, type Shortcut } from '@/shortcuts/registry';

export interface ShortcutTableProps {
  shortcuts: Shortcut[];
  className?: string;
  /** Tighter rows (overlay, cheat sheet). */
  dense?: boolean;
}

/** Rows of "what it does" + key caps for one area; sub-headed by group when entries have one. */
export function ShortcutTable({ shortcuts, className, dense = false }: ShortcutTableProps): ReactElement {
  const { t } = useTranslation();
  const groups = groupShortcuts(shortcuts);
  return (
    <div className={cn('space-y-3', className)}>
      {groups.map(({ group, items }) => (
        <div key={group ?? '_'} className="shortcut-group">
          {group !== undefined && (
            <h4 className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-text-tertiary">
              {t(`shortcuts.groups.${group}`)}
            </h4>
          )}
          <table className="w-full border-collapse text-left">
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="shortcut-row border-b border-border-subtle last:border-b-0 max-sm:block max-sm:py-1.5">
                  <td className={cn('align-middle text-text-primary max-sm:block', dense ? 'py-1.5 pr-3 text-[13px]' : 'py-2 pr-4 text-sm')}>
                    {t(s.descriptionKey)}
                    {s.noteKey !== undefined && (
                      <span className="block text-xs leading-snug text-text-tertiary">{t(s.noteKey)}</span>
                    )}
                  </td>
                  <td className={cn('align-middle sm:w-[46%] sm:text-right max-sm:block max-sm:pt-1', dense ? 'py-1.5' : 'py-2')}>
                    <ShortcutKeys id={s.id} className="sm:justify-end" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
