import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { apiErrorMessage, crmApi, type LeadStage, type StageType } from '@/services/crm';
import { CrmShell, nativeSelectClass } from './CrmShell';
import { useCrmLabels } from './crmUtils';
import { WhatsAppSettingsCard } from './whatsapp/WhatsAppSettingsCard';
import { TrackingSettingsCard } from './TrackingSettingsCard';
import { MetaAdsSyncCard } from './MetaAdsSyncCard';

function StageRow({
  stage, index, last, onMove,
}: { stage: LeadStage; index: number; last: boolean; onMove: (from: number, to: number) => void }) {
  const { t, stageLabel } = useCrmLabels();
  const qc = useQueryClient();
  const [name, setName] = useState(stageLabel(stage));
  useEffect(() => { setName(stageLabel(stage)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stage.name, stage.key]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });
  const upd = useMutation({
    mutationFn: (d: Parameters<typeof crmApi.updateStage>[1]) => crmApi.updateStage(stage.id, d),
    onSuccess: invalidate,
    onError: (err) => { toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))); invalidate(); },
  });
  const del = useMutation({
    mutationFn: () => crmApi.deleteStage(stage.id),
    onSuccess: () => { toast.success(t('crm.settings.stageDeleted', 'Stage removed.')); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.delete', 'Could not delete.'))),
  });

  const commitName = () => {
    const v = name.trim();
    if (v && v !== stageLabel(stage)) upd.mutate({ name: v });
    else setName(stageLabel(stage));
  };

  return (
    <li className={cn('grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-border-subtle bg-bg-sunken p-3 md:grid-cols-[auto_minmax(0,1.4fr)_140px_170px_auto_auto]', !stage.isActive && 'opacity-60')}>
      <input
        type="color"
        value={stage.color}
        aria-label={t('crm.settings.color', 'Color')}
        onChange={(e) => upd.mutate({ color: e.target.value })}
        className="h-8 w-8 cursor-pointer rounded border border-border-subtle bg-transparent p-0.5"
      />
      <Input
        value={name}
        aria-label={t('crm.settings.stageName', 'Stage name')}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        maxLength={60}
      />
      <select className={nativeSelectClass} value={stage.type} aria-label={t('crm.settings.typeLabel', 'Type')} onChange={(e) => upd.mutate({ type: e.target.value as StageType })}>
        <option value="OPEN">{t('crm.settings.type.OPEN', 'Open')}</option>
        <option value="WON">{t('crm.settings.type.WON', 'Won')}</option>
        <option value="LOST">{t('crm.settings.type.LOST', 'Lost')}</option>
      </select>
      <select className={nativeSelectClass} value={stage.metaEvent ?? ''} aria-label={t('crm.settings.metaEvent', 'Meta event')} onChange={(e) => upd.mutate({ metaEvent: e.target.value || null })}>
        <option value="">{t('crm.settings.noEvent', 'No Meta event')}</option>
        <option value="LeadSubmitted">LeadSubmitted</option>
        <option value="QualifiedLead">QualifiedLead</option>
        <option value="Purchase">Purchase</option>
      </select>
      <div className="col-span-2 flex items-center justify-between gap-2 md:col-span-1 md:justify-end">
        <div className="flex items-center gap-2">
          <Switch checked={stage.isActive} onCheckedChange={(v) => upd.mutate({ isActive: v })} aria-label={t('crm.settings.active', 'Active')} />
          <span className="text-xs text-text-tertiary md:hidden">{t('crm.settings.active', 'Active')}</span>
        </div>
        <div className="flex items-center">
          <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} aria-label={t('crm.settings.up', 'Move up')} onClick={() => onMove(index, index - 1)}><ArrowUp /></Button>
          <Button type="button" variant="ghost" size="icon-sm" disabled={last} aria-label={t('crm.settings.down', 'Move down')} onClick={() => onMove(index, index + 1)}><ArrowDown /></Button>
          {!stage.key && (
            <Button
              type="button" variant="ghost" size="icon-sm" className="text-danger" aria-label={t('crm.settings.delete', 'Delete stage')}
              onClick={() => { if (window.confirm(t('crm.settings.deleteConfirm', 'Delete this stage?'))) del.mutate(); }}
            ><Trash2 /></Button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function CrmSettingsPage() {
  const { t } = useCrmLabels();
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ['crm', 'settings'], queryFn: crmApi.settings });
  const stages = [...(settingsQ.data?.stages ?? [])].sort((a, b) => a.order - b.order);
  const [threshold, setThreshold] = useState('15');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (settingsQ.data) setThreshold(String(settingsQ.data.responseThresholdMinutes));
  }, [settingsQ.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });
  const saveThreshold = useMutation({
    mutationFn: () => crmApi.updateSettings({ responseThresholdMinutes: Number(threshold) }),
    onSuccess: () => { toast.success(t('crm.settings.saved', 'Settings saved.')); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => crmApi.reorderStages(ids),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const addStage = useMutation({
    mutationFn: () => crmApi.createStage({ name: newName.trim() }),
    onSuccess: () => { setNewName(''); invalidate(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });

  const move = (from: number, to: number) => {
    const ids = stages.map((s) => s.id);
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    reorder.mutate(ids);
  };
  const thresholdNum = Number(threshold);
  const thresholdOk = Number.isInteger(thresholdNum) && thresholdNum >= 1 && thresholdNum <= 1440;

  return (
    <CrmShell>
      <PageHeader
        title={t('crm.settings.title', 'CRM settings')}
        description={t('crm.settings.subtitle', 'Response-time target and pipeline stages.')}
        breadcrumbs={[{ label: t('crm.leads.title', 'Leads'), href: '/crm/leads' }, { label: t('crm.settings.title', 'CRM settings') }]}
        actions={<GuideHelpLink slug="crm-whatsapp-setup" />}
      />
      <div className="space-y-5">
        <GlassPanel padding="none" className="p-5">
          <h2 className="mb-1 text-sm font-semibold">{t('crm.settings.threshold', 'Response-time target')}</h2>
          <p className="mb-3 text-sm text-text-secondary">{t('crm.settings.thresholdHint', 'A lead without a first reply after this many minutes is flagged as unanswered.')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-threshold">{t('crm.settings.minutes', 'Minutes')}</Label>
              <Input id="crm-threshold" type="number" min={1} max={1440} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="w-32" aria-invalid={!thresholdOk} />
            </div>
            <Button type="button" disabled={!thresholdOk || saveThreshold.isPending} onClick={() => saveThreshold.mutate()}>{t('crm.common.save', 'Save')}</Button>
          </div>
        </GlassPanel>

        <GlassPanel padding="none" className="p-5">
          <h2 className="mb-1 text-sm font-semibold">{t('crm.settings.stages', 'Pipeline stages')}</h2>
          <p className="mb-4 text-sm text-text-secondary">{t('crm.settings.stagesHint', 'Order, names and colors. The Meta event is queued when a lead enters the stage (once per lead). You need at least one Open, one Won and one Lost stage.')}</p>
          <ul className="space-y-2.5">
            {stages.map((s, i) => <StageRow key={s.id} stage={s} index={i} last={i === stages.length - 1} onMove={move} />)}
          </ul>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => { e.preventDefault(); if (newName.trim()) addStage.mutate(); }}
          >
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="crm-new-stage">{t('crm.settings.newStage', 'New stage')}</Label>
              <Input id="crm-new-stage" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} placeholder={t('crm.settings.newStagePlaceholder', 'e.g. Negotiation')} />
            </div>
            <Button type="submit" variant="outline" className="gap-2" disabled={!newName.trim() || addStage.isPending}><Plus /> {t('crm.settings.addStage', 'Add stage')}</Button>
          </form>
        </GlassPanel>

        <TrackingSettingsCard />

        <MetaAdsSyncCard />

        <WhatsAppSettingsCard />
      </div>
    </CrmShell>
  );
}
