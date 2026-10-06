import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle, Check, CheckCheck, Clock, Download, ExternalLink, FileText, Image as ImageIcon, Megaphone, Reply, Search, Smartphone, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiErrorMessage, crmApi } from '@/services/crm';
import {
  whatsappApi, type WaMessage, type WaQuickReply, type WaReferral, type WaStatus, type WaTemplate, type WaWindow,
} from '@/services/whatsapp';
import { useCrmLabels } from '../crmUtils';
import { nativeSelectClass } from '../CrmShell';

export function useWaLabels() {
  const base = useCrmLabels();
  const { t } = base;
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }),
    [],
  );
  const statusLabel = (s: WaStatus): string => ({
    RECEIVED: t('crm.wa.status.RECEIVED', 'Received'),
    PENDING: t('crm.wa.status.PENDING', 'Sending'),
    SENT: t('crm.wa.status.SENT', 'Sent'),
    DELIVERED: t('crm.wa.status.DELIVERED', 'Delivered'),
    READ: t('crm.wa.status.READ', 'Read'),
    FAILED: t('crm.wa.status.FAILED', 'Failed'),
  }[s]);
  const originLabel = (m: Pick<WaMessage, 'origin' | 'direction' | 'sentBy'>): string | null => {
    if (m.origin === 'MONOMI') {
      return m.sentBy ? t('crm.wa.origin.monomiBy', 'Monomi · {{name}}', { name: m.sentBy.name }) : t('crm.wa.origin.monomi', 'Monomi');
    }
    if (m.origin === 'PHONE_APP') return t('crm.wa.origin.phone', 'Sent from phone app');
    if (m.origin === 'HISTORY') {
      return m.direction === 'IN' ? t('crm.wa.origin.historyIn', 'Imported history') : t('crm.wa.origin.historyOut', 'Imported history · business');
    }
    return null;
  };
  /** "in 5 h 12 min" relative to now. */
  const until = (iso: string | null): string => {
    if (!iso) return '';
    const minutes = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
    return base.formatWait(minutes);
  };
  const time = (iso: string) => timeFmt.format(new Date(iso));
  return { ...base, statusLabel, originLabel, until, time };
}

export function Ticks({ status, error }: { status: WaStatus; error?: string | null }) {
  const { statusLabel } = useWaLabels();
  const label = error ? `${statusLabel(status)}: ${error}` : statusLabel(status);
  const cls = 'h-3.5 w-3.5 shrink-0';
  let icon: React.ReactNode = null;
  if (status === 'PENDING') icon = <Clock className={cn(cls, 'text-text-tertiary')} />;
  else if (status === 'SENT') icon = <Check className={cn(cls, 'text-text-tertiary')} />;
  else if (status === 'DELIVERED') icon = <CheckCheck className={cn(cls, 'text-text-tertiary')} />;
  else if (status === 'READ') icon = <CheckCheck className={cn(cls, 'text-sky-400')} />;
  else if (status === 'FAILED') icon = <AlertCircle className={cn(cls, 'text-danger')} />;
  if (!icon) return null;
  return <span role="img" aria-label={label} title={label} className="inline-flex">{icon}</span>;
}

const safeHttpUrl = (u?: string): string | null => (u && /^https?:\/\//i.test(u) ? u : null);

/** "This chat started from an ad" banner (Click-to-WhatsApp referral). */
export function CtwaBanner({ referral, at }: { referral: WaReferral; at?: string }) {
  const { t, formatDateTime } = useWaLabels();
  const link = safeHttpUrl(referral.source_url);
  return (
    <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-text-primary">
          {t('crm.wa.ctwa.title', 'Started from a Click-to-WhatsApp ad')}
          {at ? <span className="ml-2 font-mono text-[11px] font-normal text-text-tertiary">{formatDateTime(at)}</span> : null}
        </div>
        {referral.headline && <div className="mt-0.5 break-words text-text-primary">“{referral.headline}”</div>}
        {referral.body && <div className="mt-0.5 line-clamp-2 break-words text-text-secondary">{referral.body}</div>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
          {referral.source_type && <span>{t('crm.wa.ctwa.type', 'Type: {{type}}', { type: referral.source_type })}</span>}
          {referral.source_id && <span className="font-mono">{t('crm.wa.ctwa.adId', 'Ad ID {{id}}', { id: referral.source_id })}</span>}
          {referral.ctwa_clid && <span>{t('crm.wa.ctwa.clid', 'Ad click ID saved (for Meta reporting)')}</span>}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-text-primary">
              {t('crm.wa.ctwa.open', 'Open ad')} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function WindowIndicator({ window: w, className }: { window: WaWindow; className?: string }) {
  const { t, until, formatDateTime } = useWaLabels();
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', className)}>
      {w.open ? (
        <span className="inline-flex items-center gap-1.5 text-success">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          {t('crm.wa.window.open', '24h reply window open · closes in {{time}}', { time: until(w.expiresAt) })}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-warning">
          <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />
          {t('crm.wa.window.closed', '24h window closed · only approved templates can be sent')}
        </span>
      )}
      {w.freeEntryActive && w.freeEntryUntil && (
        <span className="inline-flex items-center gap-1.5 text-text-secondary" title={t('crm.wa.window.freeHint', 'Chats that start from a Click-to-WhatsApp ad get a 72-hour free entry point window.')}>
          <Zap className="h-3 w-3" aria-hidden />
          {t('crm.wa.window.free', 'Ad free-entry window until {{at}}', { at: formatDateTime(w.freeEntryUntil) })}
        </span>
      )}
    </div>
  );
}

/** Click-to-load media through the authenticated proxy (object URL, revoked on unmount). */
export function MediaBlock({ m }: { m: WaMessage }) {
  const { t } = useWaLabels();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const mime = m.mediaMime ?? '';
  const kind = m.type === 'image' || m.type === 'sticker' ? 'image' : m.type === 'audio' ? 'audio' : m.type === 'video' ? 'video' : 'file';
  if (!m.hasMedia) {
    return <p className="text-xs italic text-text-tertiary">{t('crm.wa.media.unavailable', 'Media not available (older than 14 days or not shared).')}</p>;
  }
  const load = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await whatsappApi.media(m.id);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  if (url) {
    if (kind === 'image') return <img src={url} alt={m.mediaCaption ?? t('crm.wa.media.image', 'Photo')} className="max-h-72 w-auto max-w-full rounded-md" />;
    if (kind === 'audio') return <audio controls src={url} className="w-60 max-w-full" />;
    if (kind === 'video') return <video controls src={url} className="max-h-72 max-w-full rounded-md" />;
    return (
      <a href={url} download={m.mediaFilename ?? 'whatsapp-file'} className="inline-flex items-center gap-1.5 text-sm underline underline-offset-2">
        <Download className="h-4 w-4" /> {m.mediaFilename ?? t('crm.wa.media.file', 'File')}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={load}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-xs text-text-secondary hover:text-text-primary disabled:opacity-60"
    >
      {kind === 'image' ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      {busy ? t('crm.wa.media.loading', 'Loading…') : failed ? t('crm.wa.media.retry', 'Could not load — retry') : (
        <>
          {kind === 'image' ? t('crm.wa.media.showImage', 'Show photo') : kind === 'audio' ? t('crm.wa.media.playAudio', 'Load voice note') : kind === 'video' ? t('crm.wa.media.showVideo', 'Load video') : (m.mediaFilename ?? t('crm.wa.media.showFile', 'Load file'))}
          {mime ? <span className="font-mono text-[10px] text-text-tertiary">{mime.split(';')[0]}</span> : null}
        </>
      )}
    </button>
  );
}

export function MessageBubble({ m, onReply, replyTarget }: { m: WaMessage; onReply?: (m: WaMessage) => void; replyTarget?: WaMessage | null }) {
  const { t, originLabel, time } = useWaLabels();
  const out = m.direction === 'OUT';
  const origin = originLabel(m);
  const tone = !out
    ? 'bg-bg-raised border-border-subtle'
    : m.origin === 'PHONE_APP'
      ? 'bg-emerald-500/10 border-emerald-500/30'
      : m.origin === 'HISTORY'
        ? 'bg-bg-sunken border-border-subtle'
        : 'bg-sky-500/10 border-sky-500/30';
  return (
    <li className={cn('group flex', out ? 'justify-end' : 'justify-start')}>
      <div className={cn('relative max-w-[85%] rounded-xl border px-3 py-2 sm:max-w-[70%]', tone, m.origin === 'HISTORY' && 'opacity-80')}>
        {origin && (
          <div className={cn('mb-1 flex items-center gap-1 text-[11px] font-medium', m.origin === 'PHONE_APP' ? 'text-emerald-400' : m.origin === 'MONOMI' ? 'text-sky-400' : 'text-text-tertiary')}>
            {m.origin === 'PHONE_APP' && <Smartphone className="h-3 w-3" aria-hidden />}
            {origin}
          </div>
        )}
        {replyTarget && (
          <div className="mb-1.5 border-l-2 border-text-tertiary/50 pl-2 text-xs text-text-tertiary line-clamp-2">
            {replyTarget.text ?? `[${replyTarget.type}]`}
          </div>
        )}
        {m.type === 'template' && (
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-tertiary">{t('crm.wa.template', 'Template')} · {m.templateName}</div>
        )}
        {m.hasMedia || ['image', 'video', 'audio', 'document', 'sticker'].includes(m.type) ? <div className="mb-1"><MediaBlock m={m} /></div> : null}
        {m.text && (
          <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{m.type === 'reaction' ? t('crm.wa.reaction', 'Reacted {{emoji}}', { emoji: m.text }) : m.text}</p>
        )}
        {!m.text && !['image', 'video', 'audio', 'document', 'sticker'].includes(m.type) && (
          <p className="text-sm italic text-text-tertiary">{t('crm.wa.unsupported', 'Unsupported message ({{type}})', { type: m.type })}</p>
        )}
        {m.status === 'FAILED' && m.errorTitle && <p className="mt-1 text-xs text-danger">{m.errorTitle}</p>}
        <div className="mt-1 flex items-center justify-end gap-1.5">
          {onReply && m.waMessageId && (
            <button
              type="button"
              onClick={() => onReply(m)}
              className="mr-auto text-text-tertiary opacity-100 hover:text-text-primary sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={t('crm.wa.reply', 'Reply')}
            ><Reply className="h-3.5 w-3.5" /></button>
          )}
          <span className="font-mono text-[10px] text-text-tertiary">{time(m.timestamp)}</span>
          {out && <Ticks status={m.status} error={m.errorTitle} />}
        </div>
      </div>
    </li>
  );
}

export function TemplateDialog({
  open, onOpenChange, conversationId, onSent,
}: { open: boolean; onOpenChange: (o: boolean) => void; conversationId: string; onSent: () => void }) {
  const { t } = useWaLabels();
  const q = useQuery({ queryKey: ['wa', 'templates'], queryFn: () => whatsappApi.templates(), enabled: open, staleTime: 5 * 60_000, retry: false });
  const [key, setKey] = useState('');
  const [params, setParams] = useState<string[]>([]);
  const list = q.data ?? [];
  const tpl: WaTemplate | undefined = list.find((x) => `${x.name}|${x.language}` === key);
  useEffect(() => { setParams(Array.from({ length: tpl?.paramCount ?? 0 }, () => '')); }, [tpl?.name, tpl?.language, tpl?.paramCount]);
  const preview = tpl?.bodyText?.replace(/\{\{\s*(\d{1,2})\s*\}\}/g, (_, n) => params[Number(n) - 1] || `{{${n}}}`) ?? '';
  const mut = useMutation({
    mutationFn: () => whatsappApi.sendTemplate(conversationId, tpl!.name, tpl!.language, params.map((p) => p.trim())),
    onSuccess: () => { toast.success(t('crm.wa.templateSent', 'Template sent.')); onSent(); onOpenChange(false); setKey(''); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.wa.errors.send', 'Could not send the message.'))),
  });
  const ok = !!tpl && params.every((p) => p.trim().length > 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto" srTitle={t('crm.wa.templateTitle', 'Send a template')}>
        <DialogHeader>
          <DialogTitle>{t('crm.wa.templateTitle', 'Send a template')}</DialogTitle>
          <DialogDescription>{t('crm.wa.templateHint', 'Outside the 24-hour window WhatsApp only allows templates approved by Meta.')}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
        ) : q.isError ? (
          <p className="text-sm text-danger">{apiErrorMessage(q.error, t('crm.wa.errors.templates', 'Could not load templates.'))}</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('crm.wa.noTemplates', 'No approved templates yet. Create them in WhatsApp Manager.')}</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wa-tpl">{t('crm.wa.templatePick', 'Template')}</Label>
              <select id="wa-tpl" className={nativeSelectClass} value={key} onChange={(e) => setKey(e.target.value)}>
                <option value="">{t('crm.wa.templateChoose', 'Choose…')}</option>
                {list.map((x) => <option key={`${x.name}|${x.language}`} value={`${x.name}|${x.language}`}>{x.name} · {x.language}{x.category ? ` · ${x.category}` : ''}</option>)}
              </select>
            </div>
            {params.map((p, i) => (
              <div key={i} className="space-y-1.5">
                <Label htmlFor={`wa-p${i}`}>{t('crm.wa.templateParam', 'Value {{n}}', { n: i + 1 })}</Label>
                <Input id={`wa-p${i}`} value={p} maxLength={1000} onChange={(e) => setParams((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
            ))}
            {tpl && (
              <div className="rounded-lg border border-border-subtle bg-bg-sunken p-3 text-sm whitespace-pre-wrap break-words">{preview || tpl.name}</div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('crm.common.cancel', 'Cancel')}</Button>
          <Button type="button" disabled={!ok || mut.isPending} onClick={() => mut.mutate()}>{t('crm.wa.send', 'Send')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuickRepliesMenu({ onPick, disabled }: { onPick: (r: WaQuickReply) => void; disabled?: boolean }) {
  const { t } = useWaLabels();
  const q = useQuery({ queryKey: ['wa', 'quick-replies'], queryFn: whatsappApi.quickReplies, staleTime: 60_000 });
  const items = q.data ?? [];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={t('crm.wa.quickReplies', 'Quick replies')} title={t('crm.wa.quickReplies', 'Quick replies')}>
          <Zap />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-xs bg-bg-raised border-border-subtle text-text-primary">
        <DropdownMenuLabel>{t('crm.wa.quickReplies', 'Quick replies')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-text-tertiary">{t('crm.wa.quickRepliesEmpty', 'None yet — add them in CRM settings.')}</div>
        ) : items.map((r, i) => (
          <DropdownMenuItem key={i} onSelect={() => onPick(r)} className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">{r.title}</span>
            <span className="line-clamp-1 text-xs text-text-tertiary">{r.text}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LinkLeadDialog({
  open, onOpenChange, conversationId, currentLeadId,
}: { open: boolean; onOpenChange: (o: boolean) => void; conversationId: string; currentLeadId: string | null }) {
  const { t, stageLabel } = useWaLabels();
  const qc = useQueryClient();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const h = setTimeout(() => setDebounced(term.trim()), 300); return () => clearTimeout(h); }, [term]);
  const q = useQuery({
    queryKey: ['crm', 'leads', 'wa-link', debounced],
    queryFn: () => crmApi.listLeads({ q: debounced || undefined, limit: 20 }),
    enabled: open,
  });
  const mut = useMutation({
    mutationFn: (leadId: string | null) => whatsappApi.linkLead(conversationId, leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa'] });
      qc.invalidateQueries({ queryKey: ['crm', 'lead'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-md overflow-y-auto" srTitle={t('crm.wa.linkLead', 'Link to lead')}>
        <DialogHeader><DialogTitle>{t('crm.wa.linkLead', 'Link to lead')}</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('crm.wa.linkSearch', 'Search name, company or number')} className="pl-9" aria-label={t('crm.wa.linkSearch', 'Search name, company or number')} />
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {(q.data?.items ?? []).map((l) => (
            <li key={l.id}>
              <button
                type="button"
                disabled={mut.isPending}
                onClick={() => mut.mutate(l.id)}
                className={cn('flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-bg-raised', l.id === currentLeadId && 'bg-bg-raised')}
              >
                <span className="min-w-0"><span className="block truncate font-medium">{l.name}</span><span className="block truncate font-mono text-xs text-text-tertiary">{l.phone ?? ''}</span></span>
                <span className="shrink-0 text-xs text-text-secondary">{stageLabel(l.stage)}</span>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          {currentLeadId && <Button type="button" variant="ghost" className="mr-auto text-danger" disabled={mut.isPending} onClick={() => mut.mutate(null)}>{t('crm.wa.unlink', 'Unlink')}</Button>}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('crm.common.cancel', 'Cancel')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
