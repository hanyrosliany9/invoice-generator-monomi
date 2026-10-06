import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Inbox, Megaphone, MessageCircle, Search, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { cn } from '@/lib/utils';
import { whatsappApi, type WaConversation, type WaListFilters } from '@/services/whatsapp';
import { CrmShell, nativeSelectClass } from './CrmShell';
import { ConversationView } from './whatsapp/ConversationView';
import { useWaLabels } from './whatsapp/WaParts';

type Filter = NonNullable<WaListFilters['filter']>;

const initials = (name: string) =>
  name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '#';

function ConversationRow({ c, active }: { c: WaConversation; active: boolean }) {
  const { t, formatDateTime, stageLabel } = useWaLabels();
  const fromAd = c.lead?.source === 'WHATSAPP_CTWA';
  return (
    <li>
      <Link
        to={`/crm/inbox/${c.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-raised',
          active && 'bg-bg-raised ring-1 ring-ring/40',
        )}
      >
        <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-sm font-semibold text-text-secondary">
          {initials(c.contact.displayName)}
          <span
            className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-base', c.window.open ? 'bg-success' : 'bg-text-tertiary/50')}
            title={c.window.open ? t('crm.wa.window.openShort', 'Reply window open') : t('crm.wa.window.closedShort', 'Window closed')}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-sm', c.unreadCount > 0 ? 'font-semibold text-text-primary' : 'text-text-primary')}>{c.contact.displayName}</span>
            <span className="shrink-0 font-mono text-[10px] text-text-tertiary">{c.lastMessageAt ? formatDateTime(c.lastMessageAt) : ''}</span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn('truncate text-xs', c.unreadCount > 0 ? 'text-text-primary' : 'text-text-tertiary')}>{c.lastMessagePreview ?? ''}</span>
            {c.unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black" aria-label={t('crm.wa.unreadAria', '{{n}} unread', { n: c.unreadCount })}>
                {c.unreadCount > 99 ? '99+' : c.unreadCount}
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            {fromAd && <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-warning"><Megaphone className="h-2.5 w-2.5" />{t('crm.wa.fromAd', 'Ad')}</span>}
            {c.lead && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-1.5 py-0.5 text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.lead.stage.color }} />{stageLabel(c.lead.stage)}
              </span>
            )}
            {c.lead?.campaignCode && <span className="rounded-full bg-bg-sunken px-1.5 py-0.5 font-mono text-text-tertiary">{c.lead.campaignCode}</span>}
            {c.assignedTo && <span className="text-text-tertiary">· {c.assignedTo.name}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function InboxPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useWaLabels();
  const [filter, setFilter] = useState<Filter>('all');
  const [windowF, setWindowF] = useState<'' | 'open' | 'closed'>('');
  const [archived, setArchived] = useState(false);
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const h = setTimeout(() => setQ(term.trim()), 300); return () => clearTimeout(h); }, [term]);

  const listQ = useQuery({
    queryKey: ['wa', 'conversations', { filter, windowF, archived, q }],
    queryFn: () => whatsappApi.conversations({ filter, window: windowF, status: archived ? 'ARCHIVED' : 'OPEN', q: q || undefined, limit: 100 }),
    refetchInterval: 6000,
  });
  const statusQ = useQuery({ queryKey: ['wa', 'settings-status'], queryFn: () => whatsappApi.settingsStatus(), staleTime: 60_000, retry: false });
  const notConfigured = statusQ.data && !statusQ.data.configured;

  const tabs: Array<[Filter, string]> = [
    ['all', t('crm.wa.filter.all', 'All')],
    ['unread', t('crm.wa.filter.unread', 'Unread')],
    ['mine', t('crm.wa.filter.mine', 'Mine')],
    ['unassigned', t('crm.wa.filter.unassigned', 'Unassigned')],
  ];
  const items = listQ.data?.items ?? [];

  return (
    <CrmShell wide>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-normal leading-tight tracking-[-0.012em] sm:text-4xl">{t('crm.wa.title', 'WhatsApp inbox')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t('crm.wa.subtitle', 'Chats from the business number — replies from the phone app appear here too.')}</p>
        </div>
        <Link to="/crm/settings#whatsapp" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <Settings className="h-4 w-4" /> {t('crm.wa.settingsLink', 'WhatsApp settings')}
        </Link>
      </div>

      {notConfigured && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-primary">
          {t('crm.wa.notConfigured', 'WhatsApp is not connected yet. New chats will appear here once the connection is set up in CRM settings.')}
        </div>
      )}

      <GlassPanel padding="none" className="overflow-hidden">
        <div className="grid h-[calc(100dvh-220px)] min-h-[520px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* list */}
          <section className={cn('flex min-h-0 min-w-0 flex-col border-border-subtle lg:border-r', id ? 'hidden lg:flex' : 'flex')} aria-label={t('crm.wa.listLabel', 'Conversations')}>
            <div className="space-y-2 border-b border-border-subtle p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('crm.wa.search', 'Search name or number')} className="pl-9" aria-label={t('crm.wa.search', 'Search name or number')} />
              </div>
              <div role="tablist" className="flex gap-1 overflow-x-auto">
                {tabs.map(([k, label]) => (
                  <button
                    key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                    className={cn('h-8 shrink-0 rounded-md px-2.5 text-xs', filter === k ? 'bg-bg-raised font-medium text-text-primary ring-1 ring-ring/40' : 'text-text-secondary hover:text-text-primary')}
                  >{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select className={cn(nativeSelectClass, 'h-8 md:h-8 flex-1 text-xs')} value={windowF} onChange={(e) => setWindowF(e.target.value as '' | 'open' | 'closed')} aria-label={t('crm.wa.windowFilter', 'Reply window')}>
                  <option value="">{t('crm.wa.windowAny', 'Any window')}</option>
                  <option value="open">{t('crm.wa.windowOpen', '24h window open')}</option>
                  <option value="closed">{t('crm.wa.windowClosed', 'Window closed')}</option>
                </select>
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-secondary">
                  <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="h-4 w-4" />
                  {t('crm.wa.archived', 'Archived')}
                </label>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {listQ.isLoading ? (
                <div className="space-y-2 p-1">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-16 text-center text-sm text-text-tertiary">
                  <Inbox className="h-8 w-8" aria-hidden />
                  {q || filter !== 'all' || windowF || archived ? t('crm.wa.emptyFiltered', 'No conversations match these filters.') : t('crm.wa.empty', 'No conversations yet. New WhatsApp chats appear here automatically.')}
                </div>
              ) : (
                <ul className="space-y-0.5">{items.map((c) => <ConversationRow key={c.id} c={c} active={c.id === id} />)}</ul>
              )}
            </div>
          </section>

          {/* conversation */}
          <section className={cn('min-h-0 min-w-0', id ? 'flex flex-col' : 'hidden lg:flex lg:flex-col')} aria-label={t('crm.wa.conversationLabel', 'Conversation')}>
            {id ? (
              <ConversationView key={id} conversationId={id} onBack={() => navigate('/crm/inbox')} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-text-tertiary">
                <MessageCircle className="h-10 w-10" aria-hidden />
                {t('crm.wa.pick', 'Choose a conversation')}
              </div>
            )}
          </section>
        </div>
      </GlassPanel>
    </CrmShell>
  );
}
