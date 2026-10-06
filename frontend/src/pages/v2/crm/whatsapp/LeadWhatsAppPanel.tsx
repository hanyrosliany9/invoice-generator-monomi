import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { whatsappApi } from '@/services/whatsapp';
import { ConversationView } from './ConversationView';
import { useWaLabels } from './WaParts';

/** "WhatsApp" tab on the lead page: the mirrored conversation for this lead (if any). */
export function LeadWhatsAppPanel({ leadId }: { leadId: string }) {
  const { t } = useWaLabels();
  const q = useQuery({
    queryKey: ['wa', 'for-lead', leadId],
    queryFn: () => whatsappApi.forLead(leadId),
    refetchInterval: (query) => (query.state.data?.conversation ? false : 15000),
  });
  if (q.isLoading) return <Skeleton className="h-96 w-full" />;
  const conv = q.data?.conversation;
  if (!conv) {
    return (
      <GlassPanel padding="none" className="flex flex-col items-center gap-2 p-10 text-center text-sm text-text-secondary">
        <MessageCircle className="h-8 w-8 text-text-tertiary" aria-hidden />
        <p>{t('crm.wa.leadNone', 'No WhatsApp conversation is linked to this lead yet.')}</p>
        <p className="text-xs text-text-tertiary">{t('crm.wa.leadNoneHint', 'Chats from the same number are linked automatically. You can also link one from the inbox.')}</p>
        <Link to="/crm/inbox" className="mt-1 text-sm underline underline-offset-2">{t('crm.wa.openInbox', 'Open inbox')}</Link>
      </GlassPanel>
    );
  }
  return (
    <GlassPanel padding="none" className="overflow-hidden">
      <div className="flex items-center justify-end border-b border-border-subtle px-4 py-1.5">
        <Link to={`/crm/inbox/${conv.id}`} className="text-xs text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">{t('crm.wa.openInInbox', 'Open in inbox')}</Link>
      </div>
      <ConversationView conversationId={conv.id} embedded className="h-[70dvh] min-h-[460px]" />
    </GlassPanel>
  );
}
