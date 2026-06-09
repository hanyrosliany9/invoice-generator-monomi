import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Boxes,
  Camera, Cpu, Lightbulb, Mic, Aperture, Wrench, Package,
  MapPin, Calendar, Building2, LogIn, LogOut, Trash, RefreshCcw, Plus,
  ExternalLink, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { assetService, type Asset, type DepreciationPeriodRow, type CreateMaintenanceRequest } from '@/services/assets';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { usersService } from '@/services/users';
import { projectService } from '@/services/projects';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical to the list page so the chrome doesn't shift  */
/*  between routes.                                                    */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status + condition copy — keep in sync with the list page.        */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<Asset['status'], string> = {
  AVAILABLE:       'Available',
  RESERVED:        'Reserved',
  CHECKED_OUT:     'Checked Out',
  IN_MAINTENANCE:  'In Maintenance',
  BROKEN:          'Broken',
  RETIRED:         'Retired',
};

const CONDITION_LABEL: Record<Asset['condition'], string> = {
  EXCELLENT: 'Excellent',
  GOOD:      'Good',
  FAIR:      'Fair',
  POOR:      'Poor',
  BROKEN:    'Broken',
};

const statusChipClass = (status?: Asset['status']) => {
  switch (status) {
    case 'AVAILABLE':      return 'bg-success/10 text-success';
    case 'CHECKED_OUT':    return 'bg-info/10 text-info';
    case 'RESERVED':       return 'bg-accent-navy-wash text-text-primary';
    case 'IN_MAINTENANCE': return 'bg-warning/10 text-warning';
    case 'BROKEN':         return 'bg-danger/10 text-danger';
    case 'RETIRED':
    default:               return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Months between two dates, floored. Both args required.
const monthsBetween = (from: Date, to: Date) => {
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  return Math.max(months, 0);
};

// Category → lucide icon. Falls back to a neutral box.
const categoryIcon = (category?: string) => {
  const c = (category || '').toLowerCase();
  if (c.includes('camera')) return <Camera className="h-5 w-5" />;
  if (c.includes('lens') || c.includes('lensa')) return <Aperture className="h-5 w-5" />;
  if (c.includes('light')) return <Lightbulb className="h-5 w-5" />;
  if (c.includes('audio')) return <Mic className="h-5 w-5" />;
  if (c.includes('computer') || c.includes('laptop')) return <Cpu className="h-5 w-5" />;
  if (c.includes('tool') || c.includes('maintenance')) return <Wrench className="h-5 w-5" />;
  return <Package className="h-5 w-5" />;
};

/* ------------------------------------------------------------------ */
/*  Shared dialog style helpers                                        */
/* ------------------------------------------------------------------ */

const dlgInputCls =
  'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

const DlgLabel = ({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) => (
  <Label
    htmlFor={htmlFor}
    className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary"
  >
    {children}
  </Label>
);

/* ------------------------------------------------------------------ */
/*  CheckOutDialog                                                      */
/* ------------------------------------------------------------------ */

interface CheckOutDialogProps {
  assetId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

function CheckOutDialog({ assetId, open, onOpenChange, onSuccess }: CheckOutDialogProps) {
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [projectId, setProjectId] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersService.getUsers({ limit: 200 }),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectService.getProjects(),
    enabled: open,
  });

  // reset on open
  const [openKey, setOpenKey] = useState<boolean | null>(null);
  if (open !== openKey) {
    setOpenKey(open);
    if (open) { setUserId(''); setProjectId(''); }
  }

  const mutation = useMutation({
    mutationFn: () => assetService.checkOutAsset(assetId, userId, projectId || undefined),
    onSuccess: () => {
      toast.success(t('assets.action.checkOut.success', 'Aset berhasil dipinjam.'));
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? t('assets.action.checkOut.error', 'Gagal meminjam aset.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('assets.action.checkOut.title', 'Pinjam Aset')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t('assets.action.checkOut.desc', 'Tentukan pengguna dan proyek yang meminjam aset ini.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <DlgLabel htmlFor="co-user">{t('assets.action.checkOut.user', 'Pengguna')}</DlgLabel>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="co-user" className={cn('w-full', dlgInputCls)}>
                <SelectValue placeholder={t('assets.action.checkOut.userPh', 'Pilih pengguna')} />
              </SelectTrigger>
              <SelectContent className="bg-bg-raised border-border-subtle max-h-60">
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <DlgLabel htmlFor="co-project">
              {t('assets.action.checkOut.project', 'Proyek')}{' '}
              <span className="normal-case text-text-tertiary">
                ({t('common.optional', 'opsional')})
              </span>
            </DlgLabel>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="co-project" className={cn('w-full', dlgInputCls)}>
                <SelectValue placeholder={t('assets.action.checkOut.projectPh', 'Pilih proyek (opsional)')} />
              </SelectTrigger>
              <SelectContent className="bg-bg-raised border-border-subtle max-h-60">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.number ? `${p.number} — ${p.description}` : p.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost" size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!userId || mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[120px]"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving', 'Menyimpan…')}</>
            ) : (
              t('assets.action.checkOut.submit', 'Pinjam')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  CheckInDialog                                                       */
/* ------------------------------------------------------------------ */

interface CheckInDialogProps {
  assetId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

const CONDITION_VALUES_LOCAL = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BROKEN'] as const;

function CheckInDialog({ assetId, open, onOpenChange, onSuccess }: CheckInDialogProps) {
  const { t } = useTranslation();
  const [condition, setCondition] = useState<string>('GOOD');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => assetService.checkInAsset(assetId, condition, notes.trim() || undefined),
    onSuccess: () => {
      toast.success(t('assets.action.checkIn.success', 'Aset berhasil dikembalikan.'));
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? t('assets.action.checkIn.error', 'Gagal mengembalikan aset.'));
    },
  });

  const conditionLabels: Record<string, string> = {
    EXCELLENT: t('assets.condition.excellent', 'Sangat Baik'),
    GOOD: t('assets.condition.good', 'Baik'),
    FAIR: t('assets.condition.fair', 'Cukup'),
    POOR: t('assets.condition.poor', 'Buruk'),
    BROKEN: t('assets.condition.broken', 'Rusak'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('assets.action.checkIn.title', 'Kembalikan Aset')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t('assets.action.checkIn.desc', 'Catat kondisi aset saat dikembalikan.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <DlgLabel htmlFor="ci-condition">{t('assets.action.checkIn.conditionLabel', 'Kondisi Saat Kembali')}</DlgLabel>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger id="ci-condition" className={cn('w-full', dlgInputCls)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-bg-raised border-border-subtle">
                {CONDITION_VALUES_LOCAL.map((c) => (
                  <SelectItem key={c} value={c}>{conditionLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <DlgLabel htmlFor="ci-notes">
              {t('assets.action.checkIn.notesLabel', 'Catatan')}{' '}
              <span className="normal-case text-text-tertiary">({t('common.optional', 'opsional')})</span>
            </DlgLabel>
            <Input
              id="ci-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('assets.action.checkIn.notesPh', 'Kondisi, kerusakan, catatan lain…')}
              className={dlgInputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost" size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[120px]"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving', 'Menyimpan…')}</>
            ) : (
              t('assets.action.checkIn.submit', 'Kembalikan')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  DisposeDialog                                                       */
/* ------------------------------------------------------------------ */

interface DisposeDialogProps {
  assetId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

function DisposeDialog({ assetId, open, onOpenChange, onSuccess }: DisposeDialogProps) {
  const { t } = useTranslation();
  const [proceeds, setProceeds] = useState('');
  const [disposalDate, setDisposalDate] = useState(
    () => toLocalISODate(new Date()),
  );

  const mutation = useMutation({
    mutationFn: () =>
      assetService.disposeAsset(
        assetId,
        proceeds ? Number(proceeds) : undefined,
        disposalDate || undefined,
      ),
    onSuccess: () => {
      toast.success(t('assets.action.dispose.success', 'Aset berhasil dihapusbukukan.'));
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? t('assets.action.dispose.error', 'Gagal menghapusbukukan aset.'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('assets.action.dispose.title', 'Hapusbuku / Pensiunkan Aset')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t('assets.action.dispose.desc', 'Tindakan ini akan memposting jurnal pelepasan aset dan mengubah status menjadi RETIRED.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <DlgLabel htmlFor="dp-date">{t('assets.action.dispose.dateLabel', 'Tanggal Pelepasan')}</DlgLabel>
            <Input
              id="dp-date"
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              className={dlgInputCls}
            />
          </div>

          <div className="space-y-1.5">
            <DlgLabel htmlFor="dp-proceeds">
              {t('assets.action.dispose.proceedsLabel', 'Hasil Penjualan (IDR)')}{' '}
              <span className="normal-case text-text-tertiary">({t('common.optional', 'opsional')})</span>
            </DlgLabel>
            <Input
              id="dp-proceeds"
              type="number"
              min={0}
              value={proceeds}
              onChange={(e) => setProceeds(e.target.value)}
              placeholder="0"
              className={cn(dlgInputCls, 'text-right font-mono tabular-nums')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost" size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-danger text-white hover:bg-danger/90 min-w-[120px]"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving', 'Menyimpan…')}</>
            ) : (
              t('assets.action.dispose.submit', 'Hapusbuku')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  ChangeStatusDialog                                                  */
/* ------------------------------------------------------------------ */

interface ChangeStatusDialogProps {
  assetId: string;
  currentStatus: Asset['status'];
  currentCondition: Asset['condition'];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

const STATUS_VALUES_LOCAL = [
  'AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'IN_MAINTENANCE', 'BROKEN', 'RETIRED',
] as const;

function ChangeStatusDialog({
  assetId, currentStatus, currentCondition, open, onOpenChange, onSuccess,
}: ChangeStatusDialogProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Asset['status']>(currentStatus);
  const [condition, setCondition] = useState<Asset['condition']>(currentCondition);
  const [notes, setNotes] = useState('');

  // Sync when asset data changes
  const [syncKey, setSyncKey] = useState('');
  const key = currentStatus + currentCondition;
  if (key !== syncKey) {
    setSyncKey(key);
    setStatus(currentStatus);
    setCondition(currentCondition);
    setNotes('');
  }

  const mutation = useMutation({
    mutationFn: () => assetService.updateStatus(assetId, status, condition, notes.trim() || undefined),
    onSuccess: () => {
      toast.success(t('assets.action.changeStatus.success', 'Status aset diperbarui.'));
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? t('assets.action.changeStatus.error', 'Gagal memperbarui status.'));
    },
  });

  const statusLabels: Record<Asset['status'], string> = {
    AVAILABLE: t('assets.status.available', 'Tersedia'),
    RESERVED: t('assets.status.reserved', 'Direservasi'),
    CHECKED_OUT: t('assets.status.checkedOut', 'Dipinjam'),
    IN_MAINTENANCE: t('assets.status.inMaintenance', 'Dalam Perawatan'),
    BROKEN: t('assets.status.broken', 'Rusak'),
    RETIRED: t('assets.status.retired', 'Pensiun'),
  };

  const conditionLabels: Record<Asset['condition'], string> = {
    EXCELLENT: t('assets.condition.excellent', 'Sangat Baik'),
    GOOD: t('assets.condition.good', 'Baik'),
    FAIR: t('assets.condition.fair', 'Cukup'),
    POOR: t('assets.condition.poor', 'Buruk'),
    BROKEN: t('assets.condition.broken', 'Rusak'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('assets.action.changeStatus.title', 'Ubah Status Aset')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t('assets.action.changeStatus.desc', 'Perbarui status dan kondisi operasional aset.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <DlgLabel htmlFor="cs-status">{t('assets.action.changeStatus.statusLabel', 'Status Baru')}</DlgLabel>
            <Select value={status} onValueChange={(v) => setStatus(v as Asset['status'])}>
              <SelectTrigger id="cs-status" className={cn('w-full', dlgInputCls)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-bg-raised border-border-subtle">
                {STATUS_VALUES_LOCAL.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <DlgLabel htmlFor="cs-condition">{t('assets.action.changeStatus.conditionLabel', 'Kondisi')}</DlgLabel>
            <Select value={condition} onValueChange={(v) => setCondition(v as Asset['condition'])}>
              <SelectTrigger id="cs-condition" className={cn('w-full', dlgInputCls)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-bg-raised border-border-subtle">
                {CONDITION_VALUES_LOCAL.map((c) => (
                  <SelectItem key={c} value={c}>{conditionLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <DlgLabel htmlFor="cs-notes">
              {t('assets.action.changeStatus.notesLabel', 'Catatan')}{' '}
              <span className="normal-case text-text-tertiary">({t('common.optional', 'opsional')})</span>
            </DlgLabel>
            <Input
              id="cs-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('assets.action.changeStatus.notesPh', 'Alasan perubahan status…')}
              className={dlgInputCls}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost" size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[120px]"
          >
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{t('common.saving', 'Menyimpan…')}</>
            ) : (
              t('assets.action.changeStatus.submit', 'Simpan')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  LogMaintenanceDialog                                                */
/* ------------------------------------------------------------------ */

interface LogMaintenanceDialogProps {
  assetId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}

const MAINTENANCE_TYPES = [
  'Preventive',
  'Corrective',
  'Inspection',
  'Calibration',
  'Cleaning',
  'Repair',
  'Replacement',
  'Other',
] as const;

function LogMaintenanceDialog({
  assetId,
  open,
  onOpenChange,
  onSuccess,
}: LogMaintenanceDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [maintenanceType, setMaintenanceType] = useState<string>('Preventive');
  const [performedDate, setPerformedDate] = useState<Date>(new Date());
  const [description, setDescription] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [cost, setCost] = useState('');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<Date | undefined>(undefined);

  // Reset form when dialog opens
  const [openKey, setOpenKey] = useState<boolean | null>(null);
  if (open !== openKey) {
    setOpenKey(open);
    if (open) {
      setMaintenanceType('Preventive');
      setPerformedDate(new Date());
      setDescription('');
      setPerformedBy('');
      setCost('');
      setNextMaintenanceDate(undefined);
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateMaintenanceRequest = {
        maintenanceType,
        performedDate: toLocalISODate(performedDate),
        description: description.trim(),
        performedBy: performedBy.trim() || undefined,
        cost: cost ? Number(cost) : undefined,
        nextMaintenanceDate: nextMaintenanceDate
          ? toLocalISODate(nextMaintenanceDate)
          : undefined,
      };
      return assetService.addMaintenance(assetId, payload);
    },
    onSuccess: () => {
      toast.success(t('assets.maintenance.success', 'Maintenance record saved.'));
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      onOpenChange(false);
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ??
          t('assets.maintenance.error', 'Failed to save maintenance record.'),
      );
    },
  });

  const isValid = maintenanceType.trim() !== '' && description.trim() !== '';

  const typeLabels: Record<string, string> = {
    Preventive: t('assets.maintenance.type.preventive', 'Preventive'),
    Corrective: t('assets.maintenance.type.corrective', 'Corrective'),
    Inspection: t('assets.maintenance.type.inspection', 'Inspection'),
    Calibration: t('assets.maintenance.type.calibration', 'Calibration'),
    Cleaning: t('assets.maintenance.type.cleaning', 'Cleaning'),
    Repair: t('assets.maintenance.type.repair', 'Repair'),
    Replacement: t('assets.maintenance.type.replacement', 'Replacement'),
    Other: t('assets.maintenance.type.other', 'Other'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('assets.maintenance.dialogTitle', 'Log Maintenance')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {t(
              'assets.maintenance.dialogDesc',
              'Record a maintenance or service event for this asset.',
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type + Performed Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <DlgLabel htmlFor="lm-type">
                {t('assets.maintenance.typeLabel', 'Maintenance Type')}
              </DlgLabel>
              <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                <SelectTrigger id="lm-type" className={cn('w-full', dlgInputCls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  {MAINTENANCE_TYPES.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {typeLabels[mt] ?? mt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <DlgLabel>
                {t('assets.maintenance.performedDateLabel', 'Date Performed')}
              </DlgLabel>
              <MonomiDatePicker
                value={performedDate}
                onChange={(d) => setPerformedDate(d ?? new Date())}
                className={cn(dlgInputCls)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <DlgLabel htmlFor="lm-desc">
              {t('assets.maintenance.descriptionLabel', 'Description')}
            </DlgLabel>
            <Input
              id="lm-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                'assets.maintenance.descriptionPh',
                'What was done? e.g. cleaned sensor, replaced battery…',
              )}
              className={dlgInputCls}
            />
          </div>

          {/* Performed By + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <DlgLabel htmlFor="lm-by">
                {t('assets.maintenance.performedByLabel', 'Performed By')}{' '}
                <span className="normal-case text-text-tertiary">
                  ({t('common.optional', 'opsional')})
                </span>
              </DlgLabel>
              <Input
                id="lm-by"
                value={performedBy}
                onChange={(e) => setPerformedBy(e.target.value)}
                placeholder={t('assets.maintenance.performedByPh', 'Technician or vendor name')}
                className={dlgInputCls}
              />
            </div>

            <div className="space-y-1.5">
              <DlgLabel htmlFor="lm-cost">
                {t('assets.maintenance.costLabel', 'Cost (IDR)')}{' '}
                <span className="normal-case text-text-tertiary">
                  ({t('common.optional', 'opsional')})
                </span>
              </DlgLabel>
              <Input
                id="lm-cost"
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className={cn(dlgInputCls, 'text-right font-mono tabular-nums')}
              />
            </div>
          </div>

          {/* Next Maintenance Date */}
          <div className="space-y-1.5">
            <DlgLabel>
              {t('assets.maintenance.nextDateLabel', 'Next Maintenance Date')}{' '}
              <span className="normal-case text-text-tertiary">
                ({t('common.optional', 'opsional')})
              </span>
            </DlgLabel>
            <MonomiDatePicker
              value={nextMaintenanceDate}
              onChange={(d) => setNextMaintenanceDate(d ?? undefined)}
              className={cn(dlgInputCls)}
            />
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
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={!isValid || mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[140px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common.saving', 'Menyimpan…')}
              </>
            ) : (
              t('assets.maintenance.submitBtn', 'Save Maintenance Log')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell — hoisted to module scope to prevent focus-loss remounts     */
/* ------------------------------------------------------------------ */

interface ShellProps {
  user: { name: string; role: string } | null;
  children: React.ReactNode;
}

function PageShell({ user, children }: ShellProps) {
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionHeader — hoisted to module scope (was inline inside the     */
/*  page body, causing the same remount issue as Shell).               */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {t('assets.detail.recordCount', '{{count}} catatan', { count })}
        </p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AssetDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  /* ---------- dialog open state ---------- */
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [logMaintenanceOpen, setLogMaintenanceOpen] = useState(false);

  const invalidateAsset = () => {
    queryClient.invalidateQueries({ queryKey: ['asset', id] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  /* ---------- data ---------- */
  const {
    data: asset,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id!),
    enabled: !!id,
  });

  /* ---------- depreciation calculation (PSAK 16 schedule) ---------- */
  const { data: deprCalc } = useQuery({
    queryKey: ['asset-depreciation-calc', id],
    queryFn: () => assetService.getDepreciationCalculation(id!),
    enabled: !!id,
  });

  /* ---------- mutations ---------- */
  const deleteMutation = useMutation({
    mutationFn: () => assetService.deleteAsset(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(t('assets.deleted', 'Aset berhasil dihapus.'));
      navigate('/assets');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('assets.deleteFailed', 'Gagal menghapus aset.');
      toast.error(msg);
    },
  });

  /* ---------- derived: PSAK 16 straight-line snapshot ----------
     The detail page is the right surface to show the *current*
     position of an asset: how much value remains, how many months
     it has earned its keep, how much depreciation has accrued.
     We compute client-side from purchaseDate + useful life so the
     numbers stay live without a separate API call. ---------- */
  const dep = useMemo(() => {
    if (!asset) return null;
    const purchasePrice = toNumber(asset.purchasePrice);
    const residual = toNumber(asset.residualValue);
    const years = toNumber(asset.usefulLifeYears);
    const totalMonths = years * 12;
    const elapsedMonths = asset.purchaseDate
      ? monthsBetween(new Date(asset.purchaseDate), new Date())
      : 0;
    const monthsInService = Math.min(elapsedMonths, totalMonths || elapsedMonths);

    if (years <= 0 || purchasePrice <= 0) {
      return {
        purchasePrice,
        residual,
        years,
        monthsInService: elapsedMonths,
        accumulated: 0,
        currentValue: purchasePrice,
        applicable: false,
      };
    }

    const depreciableBase = Math.max(purchasePrice - residual, 0);
    const monthlyDep = depreciableBase / totalMonths;
    const accumulated = Math.min(monthlyDep * monthsInService, depreciableBase);
    const currentValue = Math.max(purchasePrice - accumulated, residual);

    return {
      purchasePrice,
      residual,
      years,
      monthsInService,
      accumulated,
      currentValue,
      applicable: true,
    };
  }, [asset]);

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <PageShell user={user}>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </PageShell>
    );
  }

  /* ---------- error / not found ---------- */
  if (error || !asset) {
    return (
      <PageShell user={user}>
        <EmptyState
          icon={<Boxes className="h-12 w-12" />}
          title={t('assets.detail.error.title', 'Aset tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'assets.detail.error.desc',
                  'Aset ini mungkin sudah dihapus atau Anda tidak memiliki akses.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/assets')}>
                <ArrowLeft className="h-4 w-4" />
                {t('assets.detail.backToList', 'Kembali ke Aset')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </PageShell>
    );
  }

  const handleDelete = () => {
    if (
      confirm(
        t(
          'assets.confirmDelete',
          `Hapus aset ${asset.assetCode || asset.name}? Tindakan ini tidak bisa dibatalkan.`,
        ),
      )
    ) {
      deleteMutation.mutate();
    }
  };

  /* ---------- related-entity column defs ----------
     Both maintenance and reservations come from the asset payload
     itself; the classic detail page already proves they're inline.
     We keep editorial table rhythm: mono-ish narrow leading column,
     narrative middle, right-aligned numerics. ---------- */
  const maintenanceColumns = [
    {
      accessorKey: 'performedDate',
      header: t('assetDetail.col.date', 'Date'),
      cell: ({ row }: { row: { original: any } }) => (
        <DateDisplay
          date={row.original.performedDate}
          className="text-xs text-text-tertiary"
        />
      ),
    },
    {
      id: 'type',
      header: t('assetDetail.col.type', 'Type'),
      accessorFn: (row: any) => row?.maintenanceType ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <span className="text-sm text-text-secondary">
          {row.original.maintenanceType || '—'}
        </span>
      ),
    },
    {
      id: 'description',
      header: t('assetDetail.col.description', 'Description'),
      accessorFn: (row: any) => row?.description ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="min-w-0 max-w-[320px]">
          <div className="text-sm text-text-primary truncate">
            {row.original.description || '—'}
          </div>
          {row.original.performedBy && (
            <div className="text-xs text-text-tertiary truncate mt-0.5">
              {row.original.performedBy}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'cost',
      header: () => <span className="block text-right">{t('assetDetail.col.cost', 'Cost')}</span>,
      cell: ({ row }: { row: { original: any } }) => (
        <div className="text-right">
          <MoneyDisplay
            amount={toNumber(row.original.cost)}
            className="text-text-primary"
          />
        </div>
      ),
    },
  ];

  const reservationColumns = [
    {
      id: 'period',
      header: t('assetDetail.col.period', 'Period'),
      accessorFn: (row: any) => row?.startDate ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <div className="text-xs text-text-tertiary">
          <DateDisplay date={row.original.startDate} />
          <span className="mx-1">→</span>
          <DateDisplay date={row.original.endDate} />
        </div>
      ),
    },
    {
      id: 'user',
      header: t('assetDetail.col.user', 'User'),
      accessorFn: (row: any) => row?.user?.name ?? '',
      cell: ({ row }: { row: { original: any } }) => (
        <span className="text-sm text-text-secondary">
          {row.original.user?.name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'purpose',
      header: t('assetDetail.col.purpose', 'Purpose'),
      cell: ({ row }: { row: { original: any } }) => (
        <div className="min-w-0 max-w-[280px]">
          <div className="text-sm text-text-primary truncate">
            {row.original.purpose || '—'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('assetDetail.col.status', 'Status'),
      cell: ({ row }: { row: { original: any } }) => (
        <Badge
          variant="outline"
          className="border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider bg-bg-sunken text-text-secondary"
        >
          {row.original.status || '—'}
        </Badge>
      ),
    },
  ];

  const maintenanceRecords = asset.maintenanceRecords ?? [];
  const reservations = asset.reservations ?? [];

  /* ---------- render ---------- */
  return (
    <PageShell user={user}>
      {/* Back-link — quiet tertiary, sits above the header so the
          asset code can own its own line. */}
      <div className="mb-4">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('assets.detail.backToList', 'Kembali ke Aset')}
        </Link>
      </div>

      <PageHeader
        title={asset.assetCode || asset.name}
        description={
          asset.name && asset.assetCode
            ? asset.name
            : t('assets.detail.subtitle', 'Detail aset, nilai, dan riwayat operasional.')
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-3 h-7 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(asset.status),
              )}
            >
              {STATUS_LABEL[asset.status] ?? asset.status}
            </Badge>

            {/* Status-aware primary CTAs */}
            {(asset.status === 'AVAILABLE' || asset.status === 'RESERVED') && (
              <Button size="sm" onClick={() => setCheckOutOpen(true)}>
                <LogOut className="h-4 w-4" />
                {t('assets.action.checkOut.btn', 'Pinjam')}
              </Button>
            )}
            {asset.status === 'CHECKED_OUT' && (
              <Button size="sm" onClick={() => setCheckInOpen(true)}>
                <LogIn className="h-4 w-4" />
                {t('assets.action.checkIn.btn', 'Kembalikan')}
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={() => navigate(`/assets/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              {t('common.edit', 'Ubah')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'Tindakan lain')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setChangeStatusOpen(true)}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {t('assets.action.changeStatus.menuItem', 'Ubah Status')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem
                    onClick={() => setDisposeOpen(true)}
                    className="text-warning focus:text-warning"
                  >
                    <Trash className="h-3.5 w-3.5" />
                    {t('assets.action.dispose.menuItem', 'Hapusbuku / Pensiun')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/assets/${id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit', 'Ubah')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Hapus')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────
          Hero — left rail is identity (icon + name + category +
          spec line + condition); right rail is the load-bearing
          number (acquisition price) with the dates that frame it.
          One panel, two columns: avoids the tile sprawl that drowns
          the classic detail page.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
          {/* Left: identity */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-md bg-bg-sunken border border-border-subtle flex items-center justify-center text-text-secondary shrink-0">
                {categoryIcon(asset.category)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.name', 'Nama Aset')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {asset.name}
                </div>
                <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-0.5">
                  <Package className="h-3.5 w-3.5 text-text-tertiary" />
                  {asset.category}
                  {asset.subcategory && (
                    <span className="text-text-tertiary">· {asset.subcategory}</span>
                  )}
                </div>
              </div>
            </div>

            {(asset.manufacturer || asset.model || asset.serialNumber) && (
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.specs', 'Spesifikasi')}
                </div>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {[asset.manufacturer, asset.model].filter(Boolean).join(' · ') || '—'}
                </div>
                {asset.serialNumber && (
                  <div className="text-xs text-text-tertiary font-mono mt-0.5">
                    SN: {asset.serialNumber}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-text-secondary">
                  {asset.location || t('assets.detail.noLocation', 'Belum ditetapkan')}
                </span>
              </div>
              {asset.supplier && (
                <div className="flex items-center gap-1.5 text-text-tertiary">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-text-secondary">{asset.supplier}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <Wrench className="h-3.5 w-3.5" />
                <span className="text-text-secondary">
                  {CONDITION_LABEL[asset.condition] ?? asset.condition}
                </span>
              </div>
            </div>
          </div>

          {/* Right: money + dates rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('assets.detail.purchasePrice', 'Harga Perolehan')}
              </div>
              <MoneyDisplay
                amount={toNumber(asset.purchasePrice)}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('assets.detail.purchaseDate', 'Dibeli')}
                </div>
                <DateDisplay
                  date={asset.purchaseDate}
                  className="text-text-secondary"
                />
              </div>
              {asset.warrantyExpiration && (
                <div>
                  <div className="text-text-tertiary mb-0.5">
                    {t('assets.detail.warrantyEnds', 'Garansi')}
                  </div>
                  <DateDisplay
                    date={asset.warrantyExpiration}
                    className="text-text-secondary"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — money-first for asset detail:
            Original Value → Current Book Value → Accumulated Depr.
            → Months in service.
          Mirrors ProjectDetail's "money spine" pattern so an ops
          lead reads the same shape across operational entities.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t('assets.detail.kpi.original', 'Nilai Perolehan')}
            value={<MoneyDisplay amount={dep?.purchasePrice ?? 0} />}
            sublabel={t('assets.detail.kpi.originalSub', 'harga saat pembelian')}
          />
          <StatCard
            label={t('assets.detail.kpi.current', 'Nilai Buku Saat Ini')}
            value={<MoneyDisplay amount={dep?.currentValue ?? toNumber(asset.purchasePrice)} />}
            sublabel={
              dep?.applicable
                ? t('assets.detail.kpi.currentSub', 'estimasi PSAK 16 garis lurus')
                : t('assets.detail.kpi.currentSubNone', 'tidak ada skema penyusutan')
            }
          />
          <StatCard
            label={t('assets.detail.kpi.accumulated', 'Akumulasi Penyusutan')}
            value={<MoneyDisplay amount={dep?.accumulated ?? 0} />}
            sublabel={
              dep?.applicable
                ? t('assets.detail.kpi.accumulatedSub', 'sejak tanggal pembelian')
                : t('assets.detail.kpi.accumulatedSubNone', 'belum disusutkan')
            }
          />
          <StatCard
            label={t('assets.detail.kpi.monthsInService', 'Lama Beroperasi')}
            value={
              <span className="tabular-nums">
                {(dep?.monthsInService ?? 0).toLocaleString('id-ID')}
              </span>
            }
            sublabel={t('assets.detail.kpi.monthsInServiceSub', 'bulan sejak akuisisi')}
          />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Penyusutan — only when applicable. A quiet inline rail
          (not a table) since this asset only has one schedule line
          to communicate. Hides entirely when the asset has no useful
          life set, so the page stays honest about what it knows.
         ─────────────────────────────────────────────────────────── */}
      {dep?.applicable && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('assets.detail.depreciationSection', 'Skema Penyusutan')}
              count={1}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/accounting/depreciation')}
                  className="text-text-secondary border-border-subtle hover:text-text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('assets.detail.depr.processBtn', 'Proses Penyusutan')}
                </Button>
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.method', 'Metode')}
                </div>
                <div className="text-sm text-text-primary">
                  {t('assets.detail.depr.straightLine', 'Garis Lurus')}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.usefulLife', 'Umur Ekonomis')}
                </div>
                <div className="text-sm text-text-primary tabular-nums">
                  {dep.years} {t('assets.detail.depr.years', 'tahun')}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.residual', 'Nilai Sisa')}
                </div>
                <MoneyDisplay
                  amount={dep.residual}
                  className="text-sm text-text-primary tabular-nums"
                />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('assets.detail.depr.monthly', 'Penyusutan / Bulan')}
                </div>
                <MoneyDisplay
                  amount={
                    dep.years > 0
                      ? Math.max(dep.purchasePrice - dep.residual, 0) / (dep.years * 12)
                      : 0
                  }
                  className="text-sm text-text-primary tabular-nums"
                />
              </div>
            </div>
          </GlassPanel>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────
          Perhitungan Depresiasi (PSAK 16 schedule table).
          Shows the 4-column table for the FIRST and LAST period of
          the asset's depreciation life, as required by Indonesian
          accounting practice. Uses the computed schedule from the
          backend rather than the client-side estimate, so the numbers
          are authoritative.
         ─────────────────────────────────────────────────────────── */}
      {deprCalc?.hasSchedule && deprCalc.firstPeriod && deprCalc.lastPeriod && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('assets.detail.deprScheduleSection', 'Perhitungan Depresiasi')}
              count={deprCalc.totalPeriods}
            />

            {/* Summary line — method + life */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 mb-6 text-xs text-text-tertiary">
              <span>
                <span className="uppercase tracking-[0.12em] mr-1">
                  {t('assets.detail.depr.method', 'Metode')}:
                </span>
                <span className="text-text-secondary">
                  {deprCalc.schedule?.method === 'STRAIGHT_LINE'
                    ? t('assets.detail.depr.straightLine', 'Garis Lurus')
                    : deprCalc.schedule?.method}
                </span>
              </span>
              <span>
                <span className="uppercase tracking-[0.12em] mr-1">
                  {t('assets.detail.depr.usefulLife', 'Umur Ekonomis')}:
                </span>
                <span className="text-text-secondary">
                  {deprCalc.schedule?.usefulLifeYears} {t('assets.detail.depr.years', 'tahun')}
                  {' '}({deprCalc.schedule?.usefulLifeMonths} {t('assets.detail.deprTable.months', 'bulan')})
                </span>
              </span>
              <span>
                <span className="uppercase tracking-[0.12em] mr-1">
                  {t('assets.detail.depr.residual', 'Nilai Sisa')}:
                </span>
                <span className="text-text-secondary">
                  <MoneyDisplay amount={deprCalc.schedule?.residualValue ?? 0} className="inline" />
                </span>
              </span>
            </div>

            {/* 4-column table — first row + last row */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body min-w-[560px]">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="pb-3 text-left text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium w-24">
                      {t('assets.detail.deprTable.period', 'Periode')}
                    </th>
                    <th className="pb-3 text-right text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                      {t('assets.detail.deprTable.openingValue', 'Saldo Awal')}
                    </th>
                    <th className="pb-3 text-right text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                      {t('assets.detail.deprTable.depreciation', 'Perhitungan Depresiasi')}
                    </th>
                    <th className="pb-3 text-right text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                      {t('assets.detail.deprTable.accumulated', 'Akumulasi Depresiasi')}
                    </th>
                    <th className="pb-3 text-right text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                      {t('assets.detail.deprTable.closingValue', 'Saldo Akhir')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* First period */}
                  {([deprCalc.firstPeriod, deprCalc.lastPeriod] as DepreciationPeriodRow[]).map(
                    (row, idx) => (
                      <tr
                        key={row.period}
                        className={cn(
                          'border-b border-border-subtle/50 last:border-0',
                          idx === 0 ? 'bg-bg-base' : 'bg-bg-sunken/50',
                        )}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-mono text-text-primary text-[12px]">
                            {row.period}
                          </div>
                          <div className="text-[10px] text-text-tertiary mt-0.5">
                            {idx === 0
                              ? t('assets.detail.deprTable.labelFirst', 'Periode Pertama')
                              : t('assets.detail.deprTable.labelLast', 'Periode Terakhir')}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <MoneyDisplay amount={row.openingValue} className="text-text-secondary" />
                        </td>
                        <td className="py-3 text-right">
                          <MoneyDisplay
                            amount={row.depreciation}
                            className="text-warning font-medium"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <MoneyDisplay amount={row.accumulated} className="text-text-secondary" />
                        </td>
                        <td className="py-3 text-right">
                          <MoneyDisplay
                            amount={row.closingValue}
                            className={cn(
                              'font-medium',
                              idx === deprCalc.totalPeriods - 1
                                ? 'text-text-tertiary'
                                : 'text-text-primary',
                            )}
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {/* Hint about the full schedule */}
            <p className="mt-4 text-[11px] text-text-tertiary">
              {t(
                'assets.detail.deprTable.hint',
                '{{total}} periode total · hanya menampilkan periode pertama dan terakhir',
                { total: deprCalc.totalPeriods },
              )}
            </p>
          </GlassPanel>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────
          Maintenance — first because it's the section operators
          check most often (any pending repair?).
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('assets.detail.maintenanceSection', 'Riwayat Perawatan')}
            count={maintenanceRecords.length}
            action={
              <Button
                size="sm"
                variant="outline"
                className="text-text-secondary border-border-subtle hover:text-text-primary"
                onClick={() => setLogMaintenanceOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('assets.detail.maintenance.addBtn', 'Catat Perawatan')}
              </Button>
            }
          />
          {maintenanceRecords.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-12 w-12" />}
              title={t('assets.detail.noMaintenance', 'Belum ada riwayat perawatan')}
              description={t(
                'assets.detail.noMaintenanceDesc',
                'Aset ini belum pernah diservis atau dirawat.',
              )}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-text-secondary border-border-subtle hover:text-text-primary"
                  onClick={() => setLogMaintenanceOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('assets.detail.maintenance.addBtn', 'Catat Perawatan')}
                </Button>
              }
            />
          ) : (
            <DataTable
              data={maintenanceRecords}
              columns={maintenanceColumns}
              enablePagination={maintenanceRecords.length > 10}
            />
          )}
        </GlassPanel>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Reservasi / Penempatan — who has held this asset, when,
          and why. Stacks under maintenance because checkout history
          is reference material more than urgent context.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t(
              'assets.detail.reservationsSection',
              'Riwayat Reservasi & Penempatan',
            )}
            count={reservations.length}
          />
          {reservations.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title={t('assets.detail.noReservations', 'Belum ada reservasi')}
              description={t(
                'assets.detail.noReservationsDesc',
                'Aset ini belum pernah direservasi atau dipinjam.',
              )}
            />
          ) : (
            <DataTable
              data={reservations}
              columns={reservationColumns}
              enablePagination={reservations.length > 10}
            />
          )}
        </GlassPanel>
      </section>

      {/* Catatan — only when present. Kept terminal so the page
          ends with the operator's own context, not a data table. */}
      {asset.notes && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('assets.detail.notesSection', 'Catatan')}
              count={1}
            />
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {asset.notes}
            </p>
          </GlassPanel>
        </section>
      )}

      {/* ── Action Dialogs ─────────────────────────────────────────── */}
      <CheckOutDialog
        assetId={id!}
        open={checkOutOpen}
        onOpenChange={setCheckOutOpen}
        onSuccess={invalidateAsset}
      />
      <CheckInDialog
        assetId={id!}
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        onSuccess={invalidateAsset}
      />
      <DisposeDialog
        assetId={id!}
        open={disposeOpen}
        onOpenChange={setDisposeOpen}
        onSuccess={invalidateAsset}
      />
      <ChangeStatusDialog
        assetId={id!}
        currentStatus={asset.status}
        currentCondition={asset.condition}
        open={changeStatusOpen}
        onOpenChange={setChangeStatusOpen}
        onSuccess={invalidateAsset}
      />
      <LogMaintenanceDialog
        assetId={id!}
        open={logMaintenanceOpen}
        onOpenChange={setLogMaintenanceOpen}
        onSuccess={invalidateAsset}
      />
    </PageShell>
  );
}
