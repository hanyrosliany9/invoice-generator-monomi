/**
 * NewCollectionDialog — small modal to create a new collection.
 *
 * Fields: name (required), description (optional), type MANUAL | SMART.
 * On success, calls the provided onCreated callback so the parent can
 * invalidate queries and toast.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description?: string; type: 'MANUAL' | 'SMART' }) => Promise<void>;
}

export function NewCollectionDialog({ open, onOpenChange, onSubmit }: NewCollectionDialogProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'MANUAL' | 'SMART'>('MANUAL');
  const [pending, setPending] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setType('MANUAL');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    try {
      await onSubmit({
        name: trimmed,
        description: description.trim() || undefined,
        type,
      });
      reset();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-text-primary">
            {t('mediaCollections.newTitle', 'New Collection')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-sm">
            {t(
              'mediaCollections.newDesc',
              'Group assets by theme, release, or client. Smart collections update automatically.',
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="col-name" className="text-text-secondary text-xs">
              {t('mediaCollections.nameLabel', 'Name')}
              <span className="text-danger ml-0.5">*</span>
            </Label>
            <Input
              id="col-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-bg-sunken border-border-subtle text-text-primary"
              placeholder={t('mediaCollections.namePlaceholder', 'e.g. Client Finals, Best Portraits…')}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="col-desc" className="text-text-secondary text-xs">
              {t('mediaCollections.descriptionLabel', 'Description')}
              <span className="text-text-tertiary ml-1">
                {t('common.optional', '(optional)')}
              </span>
            </Label>
            <Input
              id="col-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-bg-sunken border-border-subtle text-text-primary"
              placeholder={t('mediaCollections.descriptionPlaceholder', 'Short description…')}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-text-secondary text-xs">
              {t('mediaCollections.typeLabel', 'Type')}
            </Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as 'MANUAL' | 'SMART')}
            >
              <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">
                  {t('mediaCollections.typeManual', 'Manual — add assets by hand')}
                </SelectItem>
                <SelectItem value="SMART">
                  {t('mediaCollections.typeSmart', 'Smart — auto-filtered by rules')}
                </SelectItem>
              </SelectContent>
            </Select>
            {type === 'SMART' && (
              <p className="text-[11px] text-text-tertiary">
                {t(
                  'mediaCollections.smartNote',
                  'Smart collection rules can be configured after creation.',
                )}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || pending}>
              {pending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : t('mediaCollections.create', 'Create Collection')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
