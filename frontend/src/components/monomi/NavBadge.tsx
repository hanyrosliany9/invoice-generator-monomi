import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { crmApi } from '@/services/crm';

/**
 * Amber count pill for the sidebar: CRM leads that need attention
 * (unanswered past the threshold + follow-ups due today / overdue).
 * Admin-only (the CRM API is) and silent on errors.
 */
export const NavBadge = ({ kind, dot = false }: { kind: 'crm'; dot?: boolean }) => {
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const enabled = kind === 'crm' && isAdmin();
  const { data } = useQuery({
    queryKey: ['crm', 'badges'],
    queryFn: crmApi.badges,
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const total = data?.total ?? 0;
  if (!enabled || total <= 0) return null;
  const label = (t as unknown as (k: string, f: string, o?: Record<string, unknown>) => string)(
    'crm.badge.aria', '{{n}} leads need attention', { n: total },
  );
  if (dot) {
    return <span aria-label={label} className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning" />;
  }
  return (
    <span
      aria-label={label}
      title={label}
      className="ml-auto shrink-0 rounded-full bg-warning px-1.5 py-0.5 text-[11px] font-semibold leading-none text-black"
    >
      {total > 99 ? '99+' : total}
    </span>
  );
};
