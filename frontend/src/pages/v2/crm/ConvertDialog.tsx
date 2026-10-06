import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { apiErrorMessage, crmApi, type ConvertResult, type LeadDetail } from '@/services/crm';
import { idr, toNumber, useCrmLabels } from './crmUtils';

const Check = ({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
  <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-subtle p-3 hover:border-border-default">
    <input id={id} type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>
      <span className="block text-sm font-medium text-text-primary">{label}</span>
      {hint && <span className="block text-xs text-text-tertiary">{hint}</span>}
    </span>
  </label>
);

/** Lead -> Client (+ Project + draft Quotation). Shows the created records afterwards. */
export function ConvertDialog({
  lead, open, onOpenChange,
}: { lead: LeadDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useCrmLabels();
  const qc = useQueryClient();
  const hasQuote = !!lead.quotationId;
  const [createQuotation, setCreateQuotation] = useState(!hasQuote);
  const [createProject, setCreateProject] = useState(!lead.projectId);
  const [amount, setAmount] = useState(String(toNumber(lead.estimatedValue) || ''));
  const [projectName, setProjectName] = useState(
    `${lead.company || lead.name}${lead.campaign ? ` - ${lead.campaign.name}` : ''}`,
  );
  const [result, setResult] = useState<ConvertResult | null>(null);

  const mut = useMutation({
    mutationFn: () => crmApi.convert(lead.id, {
      createQuotation,
      createProject: createQuotation ? true : createProject,
      projectName: projectName.trim() || undefined,
      amount: amount ? Number(amount) : undefined,
    }),
    onSuccess: (r) => {
      setResult(r);
      qc.invalidateQueries({ queryKey: ['crm'] });
      toast.success(t('crm.convert.done', 'Converted. The records are ready.'));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.convert.error', 'Could not convert the lead.'))),
  });

  const amountNum = Number(amount);
  const needsAmount = createQuotation && !(amountNum > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" srTitle={t('crm.convert.title', 'Convert to client')}>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl font-normal">
                <CheckCircle2 className="h-6 w-6 text-success" /> {t('crm.convert.successTitle', 'Lead converted')}
              </DialogTitle>
              <DialogDescription>
                {result.clientCreated
                  ? t('crm.convert.clientNew', 'A new client was created from this lead.')
                  : t('crm.convert.clientLinked', 'The lead was linked to an existing client with the same number.')}
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2" data-testid="convert-result">
              <li><Link className="flex items-center justify-between rounded-lg border border-border-subtle p-3 hover:border-border-default" to={`/clients/${result.clientId}`}>
                <span>{t('crm.convert.client', 'Client')}</span><ArrowRight className="h-4 w-4 text-text-tertiary" /></Link></li>
              {result.projectId && (
                <li><Link className="flex items-center justify-between rounded-lg border border-border-subtle p-3 hover:border-border-default" to={`/projects/${result.projectId}`}>
                  <span>{t('crm.convert.project', 'Project')}</span><ArrowRight className="h-4 w-4 text-text-tertiary" /></Link></li>
              )}
              {result.quotationId && (
                <li><Link className="flex items-center justify-between rounded-lg border border-border-default bg-bg-raised p-3 font-medium" to={`/quotations/${result.quotationId}`}>
                  <span>{t('crm.convert.quotation', 'Draft quotation')}</span><ArrowRight className="h-4 w-4" /></Link></li>
              )}
            </ul>
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>{t('crm.common.close', 'Close')}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-normal">{t('crm.convert.title', 'Convert to client')}</DialogTitle>
              <DialogDescription>
                {t('crm.convert.desc', 'A client is created from {{name}} (or matched by WhatsApp number). Choose what else to prepare.', { name: lead.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Check
                id="cv-quote"
                checked={createQuotation}
                onChange={setCreateQuotation}
                label={t('crm.convert.makeQuote', 'Create a draft quotation')}
                hint={hasQuote ? t('crm.convert.hasQuote', 'This lead already has a quotation.') : t('crm.convert.makeQuoteHint', 'Prefilled with the estimated value; you finish it in Quotations.')}
              />
              {!createQuotation && (
                <Check id="cv-project" checked={createProject} onChange={setCreateProject}
                  label={t('crm.convert.makeProject', 'Create a project')} />
              )}
              {(createQuotation || createProject) && (
                <div className="space-y-1.5">
                  <Label htmlFor="cv-pname">{t('crm.convert.projectName', 'Project description')}</Label>
                  <Input id="cv-pname" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                </div>
              )}
              {createQuotation && (
                <div className="space-y-1.5">
                  <Label htmlFor="cv-amount">{t('crm.convert.amount', 'Quotation amount (Rp)')}</Label>
                  <Input id="cv-amount" type="number" inputMode="numeric" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
                  {needsAmount
                    ? <p className="text-xs text-warning">{t('crm.convert.needAmount', 'Enter an amount greater than 0.')}</p>
                    : <p className="text-xs text-text-tertiary">{idr(amountNum)}</p>}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('crm.common.cancel', 'Cancel')}</Button>
              <Button type="button" disabled={mut.isPending || needsAmount} onClick={() => mut.mutate()}>
                {createQuotation ? t('crm.convert.confirmQuote', 'Convert & create quotation') : t('crm.convert.confirm', 'Convert to client')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
