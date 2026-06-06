import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { clientService, type Client } from '@/services/clients';

export interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created client so the caller can select it. */
  onCreated: (client: Client) => void;
}

/**
 * Minimal inline "create client" dialog so a user can add a missing client
 * without abandoning the quotation/invoice/project form they're filling in.
 * Only the essentials — the full client form lives at /clients/new.
 */
export function CreateClientModal({ open, onOpenChange, onCreated }: CreateClientModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Reset fields whenever the dialog opens.
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setSeeded(true);
  }
  if (!open && seeded) setSeeded(false);

  const mutation = useMutation({
    mutationFn: () =>
      clientService.createClient({
        name: name.trim(),
        company: company.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: (client) => {
      // Refresh any client pickers so the new client is selectable immediately.
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('createClient.success', 'Client created.'));
      onCreated(client);
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(
        resp?.message ||
          (err instanceof Error ? err.message : t('createClient.error', 'Failed to create client.')),
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('createClient.title', 'New Client')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t('createClient.subtitle', 'Add a client without leaving this form.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cc-name" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('createClient.name', 'Name')} <span className="text-text-tertiary">*</span>
            </Label>
            <Input
              id="cc-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('createClient.namePlaceholder', 'Contact or client name')}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-company" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('createClient.company', 'Company')}
            </Label>
            <Input
              id="cc-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t('createClient.companyPlaceholder', 'PT / company name')}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-email" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('createClient.email', 'Email')}
              </Label>
              <Input
                id="cc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-phone" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('createClient.phone', 'Phone')}
              </Label>
              <Input
                id="cc-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('createClient.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[110px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('createClient.saving', 'Saving...')}
              </>
            ) : (
              t('createClient.submit', 'Create Client')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
