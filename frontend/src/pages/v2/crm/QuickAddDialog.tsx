import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Hourglass, Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ShortcutKeys } from '@/components/ui/kbd';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/store/auth';
import { apiErrorMessage, crmApi, type CreateLeadInput, type QuickAddParse } from '@/services/crm';
import { nativeSelectClass, textareaClass } from './CrmShell';
import { useCrmAssignees, useCrmCampaigns, useCrmStages } from './crmHooks';
import { displayPhone, useCrmLabels, waitingOutcomeText } from './crmUtils';

interface FormState {
  text: string;
  name: string;
  phone: string;
  campaignId: string;
  assignedToId: string;
}

const empty = (me: string): FormState => ({ text: '', name: '', phone: '', campaignId: '', assignedToId: me });

/**
 * Paste the first WhatsApp message and the lead fills itself in:
 * name, number and the [CAMPAIGN-CODE]. Detected values never overwrite
 * fields the user has typed into. Ctrl/Cmd+Enter saves.
 */
export function QuickAddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, stageLabel, formatWait } = useCrmLabels();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const campaigns = useCrmCampaigns();
  const assignees = useCrmAssignees();
  const { stages } = useCrmStages();

  const [form, setForm] = useState<FormState>(() => empty(me?.id ?? ''));
  const touched = useRef<Set<keyof FormState>>(new Set());
  const [parsed, setParsed] = useState<QuickAddParse | null>(null);
  const [dup, setDup] = useState<QuickAddParse['duplicate']>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const setField = (k: keyof FormState, v: string, manual = true) => {
    if (manual) touched.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const reset = () => {
    touched.current = new Set();
    setForm(empty(me?.id ?? ''));
    setParsed(null);
    setDup(null);
    setTimeout(() => textRef.current?.focus(), 0);
  };

  useEffect(() => { if (open) reset(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

  // Parse the pasted text (debounced) and fill untouched fields.
  const debouncedText = useDebouncedValue(form.text, 350);
  useEffect(() => {
    if (!open || debouncedText.trim().length < 3) { setParsed(null); return; }
    let cancelled = false;
    crmApi.parse(debouncedText).then((p) => {
      if (cancelled) return;
      setParsed(p);
      setForm((f) => ({
        ...f,
        name: touched.current.has('name') ? f.name : (p.name ?? ''),
        phone: touched.current.has('phone') ? f.phone : (p.phone ?? ''),
        campaignId: touched.current.has('campaignId') ? f.campaignId : (p.campaign?.id ?? ''),
      }));
    }).catch(() => { /* parsing is a convenience only */ });
    return () => { cancelled = true; };
  }, [debouncedText, open]);

  // Duplicate check on the (possibly hand-edited) number.
  const debouncedPhone = useDebouncedValue(form.phone, 350);
  useQuery({
    queryKey: ['crm', 'dup', debouncedPhone],
    queryFn: async () => {
      const r = await crmApi.duplicate(debouncedPhone);
      setDup(r.duplicate);
      return r.duplicate;
    },
    enabled: open && debouncedPhone.replace(/\D/g, '').length >= 8,
    staleTime: 0,
  });
  useEffect(() => { if (form.phone.replace(/\D/g, '').length < 8) setDup(null); }, [form.phone]);

  // The Kode belongs to a lead auto-created from the landing-page form that
  // waits for this chat: saving fills it in (or merges it into `dup`).
  const waiting = parsed?.adClick?.waitingLead ?? null;
  const linkRef = parsed?.adClick && (parsed.adClick.available || waiting) ? parsed.adClick.ref : undefined;

  const createMut = useMutation({
    mutationFn: (vars: { another: boolean; allowDuplicate?: boolean }) => {
      const body: CreateLeadInput = {
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        campaignId: form.campaignId || undefined,
        campaignCode: !form.campaignId && parsed?.campaignCode ? parsed.campaignCode : undefined,
        assignedToId: form.assignedToId || undefined,
        firstMessage: parsed?.message ?? (form.text.trim() || undefined),
        adClickRef: linkRef,
        instagramHandle: parsed?.instagram ?? undefined,
        allowDuplicate: vars.allowDuplicate || undefined,
      };
      return crmApi.createLead(body);
    },
    onSuccess: (lead, vars) => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      if (lead.waitingOutcome) {
        // no new lead: the waiting one was filled in / merged — open it
        toast.success(waitingOutcomeText(t, lead.waitingOutcome, lead.name));
        if (vars.another) { reset(); return; }
        onOpenChange(false);
        navigate(`/crm/leads/${lead.id}`);
        return;
      }
      toast.success(t('crm.quick.saved', 'Lead {{name}} added.', { name: lead.name }), {
        action: { label: t('crm.quick.open', 'Open'), onClick: () => navigate(`/crm/leads/${lead.id}`) },
      });
      if (vars.another) reset(); else onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.quick.error', 'Could not save the lead.'))),
  });

  const canSave = (waiting ? form.phone.trim() !== '' : (form.phone.trim() !== '' || form.name.trim() !== '')) && !createMut.isPending;
  const save = (another: boolean) => {
    if (!canSave) return;
    createMut.mutate({ another, allowDuplicate: !waiting && !!dup });
  };
  const waitingWho = waiting ? (waiting.instagramHandle ? `@${waiting.instagramHandle}` : waiting.name) : '';

  const detectedCampaign = parsed?.campaign
    ?? (parsed?.campaignCode ? { id: '', code: parsed.campaignCode, name: t('crm.quick.unknownCode', 'unknown code') } : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92dvh] max-w-xl overflow-y-auto"
        srTitle={t('crm.quick.title', 'Add lead')}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(false); }
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{t('crm.quick.title', 'Add lead')}</DialogTitle>
          <DialogDescription>
            {t('crm.quick.desc', 'Paste the first WhatsApp message. The number and campaign code fill in automatically.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="crm-quick-text">{t('crm.quick.paste', 'Paste message / chat info')}</Label>
            <textarea
              id="crm-quick-text"
              ref={textRef}
              autoFocus
              rows={4}
              value={form.text}
              onChange={(e) => setField('text', e.target.value, false)}
              className={textareaClass}
              placeholder={t('crm.quick.placeholder', 'Budi Santoso +62 857-1234-9921\nHi, I am interested in a product photo package [IG-REELS2]')}
            />
          </div>

          {parsed && (parsed.name || parsed.phone || detectedCampaign) && (
            <div className="rounded-lg border border-border-subtle bg-bg-sunken p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Sparkles className="h-3.5 w-3.5" /> {t('crm.quick.detected', 'Detected automatically')}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {parsed.name && <span className="rounded-md bg-bg-raised px-2 py-1">{t('crm.quick.detName', 'Name')}: {parsed.name}</span>}
                {parsed.phone && <span className="rounded-md bg-bg-raised px-2 py-1 font-mono">{parsed.phone}</span>}
                {detectedCampaign && <span className="rounded-md bg-bg-raised px-2 py-1 font-mono">{detectedCampaign.code} · {detectedCampaign.name}</span>}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="crm-quick-name">{t('crm.quick.name', 'Name')}</Label>
              <Input id="crm-quick-name" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-quick-phone">{t('crm.quick.phone', 'WhatsApp number')} *</Label>
              <Input id="crm-quick-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+62 812-3456-7890" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-quick-campaign">{t('crm.quick.campaign', 'Campaign')}</Label>
              <select id="crm-quick-campaign" className={nativeSelectClass} value={form.campaignId} onChange={(e) => setField('campaignId', e.target.value)}>
                <option value="">{t('crm.quick.noCampaign', 'No campaign')}</option>
                {(campaigns.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crm-quick-owner">{t('crm.quick.owner', 'Owner')}</Label>
              <select id="crm-quick-owner" className={nativeSelectClass} value={form.assignedToId} onChange={(e) => setField('assignedToId', e.target.value)}>
                <option value="">{t('crm.leads.ownerNone', 'Unassigned')}</option>
                {(assignees.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {waiting && (
            <div className="flex items-start gap-2.5 rounded-lg border border-info/40 bg-info/10 p-3 text-sm" data-testid="quick-waiting-chip">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden />
              <div className="min-w-0">
                <div className="font-medium text-text-primary">{t('crm.waiting.quickChip', 'Matches waiting lead from the landing page ({{who}})', { who: waitingWho })}</div>
                <div className="text-xs text-text-secondary">
                  {!form.phone.trim()
                    ? t('crm.waiting.quickChipNeedPhone', 'Add the WhatsApp number to fill in that lead.')
                    : dup
                      ? t('crm.waiting.quickChipMerge', 'This number already belongs to {{name}}: the waiting lead is merged into it.', { name: dup.name })
                      : t('crm.waiting.quickChipFill', 'Saving adds this number to that lead. No new lead is created.')}
                </div>
              </div>
            </div>
          )}

          {parsed?.adClick && !waiting && (
            parsed.adClick.available ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-success/40 bg-success/10 p-3 text-sm" data-testid="quick-adclick-chip">
                <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <div className="min-w-0">
                  <div className="font-medium text-success">{t('crm.quick.adClick.linked', 'Linked to ad click {{ref}}', { ref: parsed.adClick.ref })}</div>
                  <div className="text-xs text-text-secondary">{t('crm.quick.adClick.linkedSub', 'The lead is saved as a Website lead with the campaign of this ad.')}</div>
                  {parsed.instagram && <div className="mt-0.5 font-mono text-xs text-text-secondary" data-testid="quick-instagram">@{parsed.instagram}</div>}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-xs text-warning">
                {t('crm.quick.adClick.taken', 'Code {{ref}} is already linked to another lead, so it will not be linked again.', { ref: parsed.adClick.ref })}
              </p>
            )
          )}

          {dup && !waiting && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {t('crm.quick.dupBefore', 'This number already exists:')}{' '}
                <strong>{dup.name}</strong>{' '}
                ({stageLabel(dup.stage)}, {t('crm.quick.dupAgo', '{{time}} ago', { time: formatWait((Date.now() - new Date(dup.createdAt).getTime()) / 60000) })}){' '}
                <button type="button" className="underline underline-offset-2" onClick={() => { onOpenChange(false); navigate(`/crm/leads/${dup.id}`); }}>
                  {t('crm.quick.dupOpen', 'Open existing lead')}
                </button>
                {form.phone && <span className="sr-only"> {displayPhone(form.phone)}</span>}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <span className="hidden items-center gap-1.5 text-xs text-text-tertiary sm:flex">
            <ShortcutKeys id="crmQuickAddSave" /> {t('crm.quick.hint', 'to save')}
          </span>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={!canSave || stages.length === 0} onClick={() => save(true)}>
              {t('crm.quick.saveAnother', 'Save & add another')}
            </Button>
            <Button type="button" disabled={!canSave || stages.length === 0} onClick={() => save(false)}>
              {waiting
                ? (dup ? t('crm.waiting.quickSaveMerge', 'Merge into existing lead') : t('crm.waiting.quickSaveFill', 'Fill in waiting lead'))
                : dup ? t('crm.quick.saveAnyway', 'Save anyway') : t('crm.quick.save', 'Save lead')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
