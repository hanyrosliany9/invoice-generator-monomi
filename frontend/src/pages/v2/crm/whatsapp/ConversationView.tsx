import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowLeft, FileText, Link2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/services/crm';
import { apiErrorCode, whatsappApi, type WaMessage } from '@/services/whatsapp';
import { nativeSelectClass, textareaClass } from '../CrmShell';
import { useCrmAssignees } from '../crmHooks';
import { displayPhone } from '../crmUtils';
import { CtwaBanner, LinkLeadDialog, MessageBubble, QuickRepliesMenu, TemplateDialog, WindowIndicator, useWaLabels } from './WaParts';

const NEAR_BOTTOM_PX = 120;

export function ConversationView({
  conversationId, onBack, embedded = false, className,
}: { conversationId: string; onBack?: () => void; embedded?: boolean; className?: string }) {
  const { t, stageLabel } = useWaLabels();
  const qc = useQueryClient();
  const assignees = useCrmAssignees();

  const convQ = useQuery({
    queryKey: ['wa', 'conversation', conversationId],
    queryFn: () => whatsappApi.conversation(conversationId),
    refetchInterval: 8000,
  });
  const msgsQ = useQuery({
    queryKey: ['wa', 'messages', conversationId],
    queryFn: () => whatsappApi.messages(conversationId),
    refetchInterval: 4000,
  });
  const conv = convQ.data;

  // older pages (newest page is polled; older ones are loaded on demand)
  const [older, setOlder] = useState<WaMessage[]>([]);
  const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  useEffect(() => { setOlder([]); setOlderHasMore(null); }, [conversationId]);
  const messages = useMemo(() => {
    const map = new Map<string, WaMessage>();
    for (const m of [...older, ...(msgsQ.data?.items ?? [])]) map.set(m.id, m);
    return [...map.values()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [older, msgsQ.data]);
  const byWamid = useMemo(() => new Map(messages.filter((m) => m.waMessageId).map((m) => [m.waMessageId as string, m])), [messages]);
  const hasMore = olderHasMore ?? msgsQ.data?.hasMore ?? false;

  const loadOlder = async () => {
    if (!messages.length) return;
    setLoadingOlder(true);
    try {
      const res = await whatsappApi.messages(conversationId, messages[0].timestamp);
      setOlder((prev) => [...res.items, ...prev]);
      setOlderHasMore(res.hasMore);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('crm.wa.errors.load', 'Could not load messages.')));
    } finally {
      setLoadingOlder(false);
    }
  };

  // auto-scroll to the newest message when the user is already near the bottom
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastCount = useRef(0);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grewAtEnd = messages.length > lastCount.current;
    if (grewAtEnd && stick.current) el.scrollTop = el.scrollHeight;
    lastCount.current = messages.length;
  }, [messages]);
  useEffect(() => { stick.current = true; lastCount.current = 0; }, [conversationId]);
  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wa', 'messages', conversationId] });
    qc.invalidateQueries({ queryKey: ['wa', 'conversation', conversationId] });
    qc.invalidateQueries({ queryKey: ['wa', 'conversations'] });
    qc.invalidateQueries({ queryKey: ['wa', 'badge'] });
  };

  // mark read while the conversation is open and visible
  const readMut = useMutation({
    mutationFn: () => whatsappApi.markRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa', 'badge'] });
      qc.invalidateQueries({ queryKey: ['wa', 'conversations'] });
    },
  });
  useEffect(() => {
    if (conv && conv.unreadCount > 0 && document.visibilityState === 'visible' && !readMut.isPending) readMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv?.id, conv?.unreadCount, conv?.lastInboundAt]);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<WaMessage | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  useEffect(() => { setText(''); setReplyTo(null); }, [conversationId]);

  const sendMut = useMutation({
    mutationFn: () => whatsappApi.sendText(conversationId, text.trim(), replyTo?.id),
    onSuccess: () => { setText(''); setReplyTo(null); stick.current = true; invalidate(); },
    onError: (err) => {
      if (apiErrorCode(err) === 'WINDOW_CLOSED') {
        toast.warning(t('crm.wa.errors.windowClosed', 'The 24-hour window is closed. Send an approved template instead.'));
        invalidate();
        setTplOpen(true);
      } else {
        toast.error(apiErrorMessage(err, t('crm.wa.errors.send', 'Could not send the message.')));
      }
    },
  });
  const assignMut = useMutation({
    mutationFn: (id: string | null) => whatsappApi.assign(conversationId, id),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.assign', 'Could not assign.'))),
  });
  const statusMut = useMutation({
    mutationFn: (s: 'OPEN' | 'ARCHIVED') => whatsappApi.setStatus(conversationId, s),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });

  if (convQ.isLoading || !conv) {
    return (
      <div className={cn('flex h-full flex-col gap-3 p-4', className)}>
        {convQ.isError
          ? <p className="text-sm text-text-secondary">{apiErrorMessage(convQ.error, t('crm.wa.errors.load', 'Could not load messages.'))}</p>
          : <><Skeleton className="h-10 w-64" /><Skeleton className="h-full w-full" /></>}
      </div>
    );
  }

  const canSend = conv.window.open;
  const send = () => { if (text.trim() && canSend && !sendMut.isPending) sendMut.mutate(); };
  const phone = displayPhone(conv.contact.phone ?? `+${conv.contact.waId}`);

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-3 py-2.5 sm:px-4">
        {onBack && (
          <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label={t('crm.wa.back', 'Back to conversations')}>
            <ArrowLeft />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-text-primary">{conv.contact.displayName}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-text-tertiary">
            <span className="font-mono">{phone}</span>
            {conv.contact.profileName && conv.contact.profileName !== conv.contact.displayName && <span>~{conv.contact.profileName}</span>}
          </div>
        </div>
        {!embedded && (
          conv.lead ? (
            <Link to={`/crm/leads/${conv.lead.id}`} className="inline-flex max-w-[50%] items-center gap-1.5 truncate rounded-full border border-border-subtle px-2.5 py-1 text-xs hover:bg-bg-raised">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: conv.lead.stage.color }} aria-hidden />
              <span className="truncate">{t('crm.wa.openLead', 'Lead')}: {stageLabel(conv.lead.stage)}</span>
            </Link>
          ) : null
        )}
        <div className="flex items-center gap-1">
          <select
            className={cn(nativeSelectClass, 'h-8 w-36 md:h-8')}
            value={conv.assignedTo?.id ?? ''}
            onChange={(e) => assignMut.mutate(e.target.value || null)}
            aria-label={t('crm.wa.assign', 'Assigned to')}
          >
            <option value="">{t('crm.leads.ownerNone', 'Unassigned')}</option>
            {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {!embedded && (
            <Button type="button" variant="ghost" size="icon" onClick={() => setLinkOpen(true)} aria-label={conv.lead ? t('crm.wa.changeLead', 'Change linked lead') : t('crm.wa.linkLead', 'Link to lead')} title={conv.lead ? t('crm.wa.changeLead', 'Change linked lead') : t('crm.wa.linkLead', 'Link to lead')}>
              <Link2 />
            </Button>
          )}
          <Button
            type="button" variant="ghost" size="icon" disabled={statusMut.isPending}
            onClick={() => statusMut.mutate(conv.status === 'OPEN' ? 'ARCHIVED' : 'OPEN')}
            aria-label={conv.status === 'OPEN' ? t('crm.wa.archive', 'Archive') : t('crm.wa.unarchive', 'Move back to inbox')}
            title={conv.status === 'OPEN' ? t('crm.wa.archive', 'Archive') : t('crm.wa.unarchive', 'Move back to inbox')}
          >
            {conv.status === 'OPEN' ? <Archive /> : <ArchiveRestore />}
          </Button>
        </div>
      </div>

      {/* messages */}
      <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
        {conv.ctwa && <div className="mb-3"><CtwaBanner referral={conv.ctwa.referral} at={conv.ctwa.at} /></div>}
        {hasMore && (
          <div className="mb-3 flex justify-center">
            <Button type="button" variant="outline" size="sm" disabled={loadingOlder} onClick={loadOlder}>{t('crm.wa.loadOlder', 'Load older messages')}</Button>
          </div>
        )}
        {msgsQ.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-2/3" /><Skeleton className="ml-auto h-12 w-1/2" /></div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-tertiary">{t('crm.wa.noMessages', 'No messages yet.')}</p>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                m={m}
                onReply={canSend ? setReplyTo : undefined}
                replyTarget={m.contextWaMessageId ? byWamid.get(m.contextWaMessageId) ?? null : null}
              />
            ))}
          </ul>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-border-subtle px-3 pb-3 pt-2 sm:px-4">
        <WindowIndicator window={conv.window} className="mb-2" />
        {replyTo && (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-border-subtle bg-bg-sunken px-2.5 py-1.5 text-xs">
            <span className="min-w-0 flex-1 truncate text-text-secondary">{t('crm.wa.replyingTo', 'Replying to')}: {replyTo.text ?? `[${replyTo.type}]`}</span>
            <button type="button" onClick={() => setReplyTo(null)} aria-label={t('crm.common.cancel', 'Cancel')} className="text-text-tertiary hover:text-text-primary"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        {canSend ? (
          <div className="flex items-end gap-1.5">
            <QuickRepliesMenu onPick={(r) => setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${r.text}` : r.text))} />
            <textarea
              rows={2}
              value={text}
              maxLength={4096}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); } }}
              placeholder={t('crm.wa.composerPlaceholder', 'Type a reply… (Ctrl+Enter to send)')}
              aria-label={t('crm.wa.composer', 'Reply')}
              className={cn(textareaClass, 'min-h-[44px] flex-1 resize-none')}
            />
            <Button type="button" size="icon" onClick={send} disabled={!text.trim() || sendMut.isPending} aria-label={t('crm.wa.send', 'Send')} className="h-11 w-11">
              <Send />
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
            <p className="text-sm text-text-secondary">{t('crm.wa.closedHint', 'The customer has not written in the last 24 hours. Re-open the chat with an approved template.')}</p>
            <Button type="button" className="gap-2" onClick={() => setTplOpen(true)}><FileText /> {t('crm.wa.sendTemplate', 'Send template')}</Button>
          </div>
        )}
        {canSend && (
          <div className="mt-1.5 flex justify-end">
            <button type="button" onClick={() => setTplOpen(true)} className="text-xs text-text-tertiary underline-offset-2 hover:text-text-primary hover:underline">
              {t('crm.wa.useTemplate', 'Use a template')}
            </button>
          </div>
        )}
      </div>

      <TemplateDialog open={tplOpen} onOpenChange={setTplOpen} conversationId={conversationId} onSent={() => { stick.current = true; invalidate(); }} />
      {!embedded && <LinkLeadDialog open={linkOpen} onOpenChange={setLinkOpen} conversationId={conversationId} currentLeadId={conv.lead?.id ?? null} />}
    </div>
  );
}
