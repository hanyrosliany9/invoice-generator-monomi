import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { crmApi } from '@/services/crm';
import { whatsappApi } from '@/services/whatsapp';

/**
 * Count pills for the sidebar (admin-only, silent on errors):
 *  - crm: amber, CRM leads that need attention (unanswered past the
 *    threshold + follow-ups due today / overdue);
 *  - whatsapp: green, WhatsApp conversations with unread messages.
 */
export const NavBadge = ({ kind, dot = false }: { kind: 'crm' | 'whatsapp'; dot?: boolean }) => {
  const { t } = useTranslation();
  const { isAdmin } = usePermissions();
  const admin = isAdmin();
  const crm = useQuery({
    queryKey: ['crm', 'badges'],
    queryFn: crmApi.badges,
    enabled: admin && kind === 'crm',
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const wa = useQuery({
    queryKey: ['wa', 'badge'],
    queryFn: whatsappApi.badge,
    enabled: admin && kind === 'whatsapp',
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: false,
  });
  const total = kind === 'crm' ? (crm.data?.total ?? 0) : (wa.data?.conversations ?? 0);
  if (!admin || total <= 0) return null;
  const tt = t as unknown as (k: string, f: string, o?: Record<string, unknown>) => string;
  const label = kind === 'crm'
    ? tt('crm.badge.aria', '{{n}} leads need attention', { n: total })
    : tt('crm.wa.badgeAria', '{{n}} WhatsApp chats unread', { n: total });
  const tone = kind === 'crm' ? 'bg-warning' : 'bg-success';
  if (dot) {
    return <span aria-label={label} className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${tone}`} />;
  }
  return (
    <span
      aria-label={label}
      title={label}
      className={`ml-auto shrink-0 rounded-full ${tone} px-1.5 py-0.5 text-[11px] font-semibold leading-none text-black`}
    >
      {total > 99 ? '99+' : total}
    </span>
  );
};
