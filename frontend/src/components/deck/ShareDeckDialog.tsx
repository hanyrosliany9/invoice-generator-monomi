import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Globe, Copy, Check, Loader2, Trash2, Mail, UserPlus, Clock,
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { decksApi, collaboratorsApi } from '@/services/decks';
import type { Deck, DeckCollaborator, CollaboratorRole, PublicAccessLevel } from '@/types/deck';

/* ------------------------------------------------------------------ */
/*  Public access level options                                        */
/* ------------------------------------------------------------------ */

const PUBLIC_ACCESS_OPTIONS: {
  value: PublicAccessLevel;
  key: string;
  fallback: string;
  hint: string;
  hintKey: string;
}[] = [
  {
    value: 'VIEW_ONLY',
    key: 'deckShare.accessViewOnly',
    fallback: 'Can view',
    hintKey: 'deckShare.accessViewOnlyHint',
    hint: 'Viewers can only browse slides.',
  },
  {
    value: 'DOWNLOAD',
    key: 'deckShare.accessDownload',
    fallback: 'Can view & download',
    hintKey: 'deckShare.accessDownloadHint',
    hint: 'Viewers can browse and export a PDF.',
  },
  {
    value: 'COMMENT',
    key: 'deckShare.accessComment',
    fallback: 'Can view & comment',
    hintKey: 'deckShare.accessCommentHint',
    hint: 'Viewers can browse and leave comments.',
  },
];

/* ------------------------------------------------------------------ */
/*  Role options shared across the invite form + the per-row selector  */
/* ------------------------------------------------------------------ */

const ROLE_OPTIONS: { value: CollaboratorRole; key: string; fallback: string }[] = [
  { value: 'EDITOR',    key: 'deckShare.roleEditor',    fallback: 'Editor' },
  { value: 'COMMENTER', key: 'deckShare.roleCommenter', fallback: 'Commenter' },
  { value: 'VIEWER',    key: 'deckShare.roleViewer',    fallback: 'Viewer' },
];

interface ShareDeckDialogProps {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDeckDialog({ deck, open, onOpenChange }: ShareDeckDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [accessLevel, setAccessLevel] = useState<PublicAccessLevel>(
    deck.publicAccessLevel ?? 'VIEW_ONLY',
  );

  /* ---------- public link ---------- */
  const publicUrl = useMemo(() => {
    if (deck.publicShareUrl) return deck.publicShareUrl;
    if (deck.publicShareToken) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}/deck/shared/${deck.publicShareToken}`;
    }
    return '';
  }, [deck.publicShareUrl, deck.publicShareToken]);

  const invalidateDeck = () => {
    queryClient.invalidateQueries({ queryKey: ['deck', deck.id] });
  };

  const togglePublicMutation = useMutation({
    mutationFn: (enable: boolean) =>
      enable
        ? decksApi.enablePublicSharing(deck.id, accessLevel)
        : decksApi.disablePublicSharing(deck.id),
    onSuccess: (_data, enable) => {
      invalidateDeck();
      toast.success(
        enable
          ? t('deckShare.publicEnabled', 'Public sharing enabled')
          : t('deckShare.publicDisabled', 'Public sharing disabled'),
      );
    },
    onError: (err: Error) =>
      toast.error(err.message || t('deckShare.publicToggleError', 'Failed to update sharing')),
  });

  const setAccessLevelMutation = useMutation({
    mutationFn: (level: PublicAccessLevel) =>
      decksApi.setPublicAccessLevel(deck.id, level),
    onSuccess: () => {
      invalidateDeck();
      toast.success(t('deckShare.accessLevelUpdated', 'Access level updated'));
    },
    onError: (err: Error) =>
      toast.error(err.message || t('deckShare.accessLevelUpdateError', 'Failed to update access level')),
  });

  const handleAccessLevelChange = (level: PublicAccessLevel) => {
    setAccessLevel(level);
    if (deck.isPublic) {
      setAccessLevelMutation.mutate(level);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success(t('deckShare.linkCopied', 'Link copied to clipboard'));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t('deckShare.copyFailed', 'Could not copy link'));
    }
  };

  /* ---------- collaborators ---------- */
  const { data: collaborators = [], isLoading: loadingCollabs } = useQuery({
    queryKey: ['deck-collaborators', deck.id],
    queryFn: () => collaboratorsApi.getByDeck(deck.id),
    enabled: open,
  });

  const invalidateCollabs = () => {
    queryClient.invalidateQueries({ queryKey: ['deck-collaborators', deck.id] });
    invalidateDeck();
  };

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('EDITOR');
  const [inviteExpiry, setInviteExpiry] = useState('');

  const inviteMutation = useMutation({
    mutationFn: () =>
      collaboratorsApi.invite({
        deckId: deck.id,
        guestEmail: inviteEmail.trim(),
        role: inviteRole,
        expiresAt: inviteExpiry ? new Date(inviteExpiry).toISOString() : undefined,
      }),
    onSuccess: () => {
      invalidateCollabs();
      toast.success(t('deckShare.inviteSent', 'Invitation sent'));
      setInviteEmail('');
      setInviteExpiry('');
    },
    onError: (err: Error) =>
      toast.error(err.message || t('deckShare.inviteError', 'Failed to send invitation')),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: CollaboratorRole }) =>
      collaboratorsApi.updateRole(id, role),
    onSuccess: () => {
      invalidateCollabs();
      toast.success(t('deckShare.roleUpdated', 'Role updated'));
    },
    onError: (err: Error) =>
      toast.error(err.message || t('deckShare.roleUpdateError', 'Failed to update role')),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => collaboratorsApi.remove(id),
    onSuccess: () => {
      invalidateCollabs();
      toast.success(t('deckShare.collaboratorRemoved', 'Collaborator removed'));
    },
    onError: (err: Error) =>
      toast.error(err.message || t('deckShare.removeError', 'Failed to remove collaborator')),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('deckShare.title', 'Share deck')}</DialogTitle>
          <DialogDescription>
            {t('deckShare.description', 'Publish a public link or invite collaborators by email.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Public sharing ───────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 text-text-tertiary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary">
                    {t('deckShare.publicLink', 'Public link')}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {t('deckShare.publicHint', 'Anyone with the link can view this deck.')}
                  </div>
                </div>
              </div>
              <Switch
                checked={deck.isPublic}
                disabled={togglePublicMutation.isPending}
                onCheckedChange={(checked) => togglePublicMutation.mutate(checked)}
                aria-label={t('deckShare.togglePublic', 'Toggle public sharing')}
              />
            </div>

            {deck.isPublic && publicUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={publicUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="bg-bg-sunken border-border-default text-text-secondary text-xs h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('deckShare.copied', 'Copied') : t('common.copy', 'Copy')}
                  </Button>
                </div>

                {/* Access level selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-text-tertiary shrink-0">
                    {t('deckShare.accessLevel', 'Anyone with link')}
                  </Label>
                  <Select
                    value={accessLevel}
                    onValueChange={(v) => handleAccessLevelChange(v as PublicAccessLevel)}
                    disabled={setAccessLevelMutation.isPending}
                  >
                    <SelectTrigger className="h-8 flex-1 text-xs bg-bg-sunken border-border-default text-text-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_ACCESS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.key, opt.fallback)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-text-tertiary">
                  {t(
                    PUBLIC_ACCESS_OPTIONS.find((o) => o.value === accessLevel)?.hintKey ?? '',
                    PUBLIC_ACCESS_OPTIONS.find((o) => o.value === accessLevel)?.hint ?? '',
                  )}
                </p>
              </div>
            )}
          </section>

          <div className="h-px bg-border-subtle" />

          {/* ── Collaborators ────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="text-sm font-medium text-text-primary">
              {t('deckShare.collaborators', 'Collaborators')}
            </div>

            {/* Invite form */}
            <form onSubmit={handleInvite} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1 min-w-0">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={t('deckShare.emailPlaceholder', 'collaborator@email.com')}
                    className="pl-9 bg-bg-sunken border-border-default text-text-primary h-9 text-sm"
                  />
                </div>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CollaboratorRole)}>
                  <SelectTrigger className="h-9 text-sm bg-bg-sunken border-border-default text-text-primary sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.key, opt.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                  <Input
                    type="date"
                    value={inviteExpiry}
                    onChange={(e) => setInviteExpiry(e.target.value)}
                    title={t('deckShare.expiryHint', 'Optional invite expiry date')}
                    className="pl-9 bg-bg-sunken border-border-default text-text-secondary h-9 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  className="shrink-0"
                >
                  {inviteMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <UserPlus className="h-3.5 w-3.5" />}
                  {t('deckShare.invite', 'Invite')}
                </Button>
              </div>
            </form>

            {/* Collaborator list */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {loadingCollabs ? (
                <div className="flex items-center justify-center py-6 text-text-tertiary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : collaborators.length === 0 ? (
                <p className="py-4 text-center text-xs text-text-tertiary">
                  {t('deckShare.noCollaborators', 'No collaborators yet.')}
                </p>
              ) : (
                collaborators.map((c) => (
                  <CollaboratorRow
                    key={c.id}
                    collaborator={c}
                    onChangeRole={(role) => updateRoleMutation.mutate({ id: c.id, role })}
                    onRemove={() => removeMutation.mutate(c.id)}
                    busy={updateRoleMutation.isPending || removeMutation.isPending}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Collaborator row                                                   */
/* ------------------------------------------------------------------ */

function CollaboratorRow({
  collaborator, onChangeRole, onRemove, busy,
}: {
  collaborator: DeckCollaborator;
  onChangeRole: (role: CollaboratorRole) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const name = collaborator.user?.name || collaborator.guestName || collaborator.guestEmail || '—';
  const email = collaborator.user?.email || collaborator.guestEmail || '';
  const isOwner = collaborator.role === 'OWNER';

  const statusLabel: Record<string, string> = {
    PENDING:  t('deckShare.statusPending', 'Pending'),
    ACCEPTED: t('deckShare.statusAccepted', 'Accepted'),
    EXPIRED:  t('deckShare.statusExpired', 'Expired'),
    REVOKED:  t('deckShare.statusRevoked', 'Revoked'),
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken/40 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-text-primary">{name}</span>
          {collaborator.status && (
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
              {statusLabel[collaborator.status] ?? collaborator.status}
            </span>
          )}
        </div>
        {email && email !== name && (
          <div className="truncate text-xs text-text-tertiary">{email}</div>
        )}
      </div>

      {isOwner ? (
        <span className="text-xs text-text-tertiary px-2">
          {t('deckShare.roleOwner', 'Owner')}
        </span>
      ) : (
        <>
          <Select
            value={collaborator.role}
            onValueChange={(v) => onChangeRole(v as CollaboratorRole)}
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs bg-bg-base border-border-default text-text-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.key, opt.fallback)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={busy}
            className="text-text-tertiary hover:text-danger shrink-0"
            aria-label={t('deckShare.remove', 'Remove collaborator')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

export default ShareDeckDialog;
