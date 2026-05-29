/* ------------------------------------------------------------------ */
/*  CallSheetEditorPage (v2)                                           */
/*                                                                     */
/*  Single combined editor — no separate detail page. Call sheets are  */
/*  worked on iteratively (lineups change, talent gets added, weather  */
/*  data arrives), so the v2 layout treats every section as in-place   */
/*  editable. Sections live inside a left/right split: form body on    */
/*  the left, summary + workflow rail on the right.                    */
/*                                                                     */
/*  Section composition (left column, top → bottom):                   */
/*    1. General           — production name, director, producer, type */
/*    2. Times             — call/first-shot/lunch/wrap/sunrise/sunset */
/*    3. Location          — name, address, parking, hospital          */
/*    4. Schedule          — activities table (useFieldArray)          */
/*    5. Crew              — table grouped by department               */
/*    6. Talent / Cast     — table (CastCall for FILM, Models for PHOTO)*/
/*    7. Notes             — general + production notes                */
/*                                                                     */
/*  Right rail (sticky on desktop):                                    */
/*    – Status chip + workflow primary action (Send / Mark Ready)      */
/*    – Quiet metadata block (last updated, type, day-N-of-M)          */
/*                                                                     */
/*  ── DEFERRED (out of v2 scope for this pass) ──                     */
/*  Classic editor (1589 LOC) carries an aggressive feature set built  */
/*  on dedicated subcomponents (ShotListSection, ModelsSection,        */
/*  WardrobeSection, HMUScheduleSection, MealBreaksSection,            */
/*  CompanyMovesSection, BackgroundCallsSection,                       */
/*  SpecialRequirementsSection, ActivitiesSection) and several         */
/*  geo/weather/PDF integrations. These remain available on the v1     */
/*  page; rebuilding them as v2 primitives is out of scope here.       */
/*                                                                     */
/*  Deferred features (banner on page surfaces this to operators):     */
/*    - PDF preview + export                                           */
/*    - Auto-fill (weather, sun times, nearest hospital, address       */
/*      autocomplete)                                                  */
/*    - Drag-to-reorder for schedule and crew                          */
/*    - FILM-specific sections: meal breaks, company moves,            */
/*      background extras, special requirements                        */
/*    - PHOTO-specific sections: shot list, wardrobe tracking, HMU     */
/*      schedule, model arrival flow                                   */
/*    - Cast advanced fields: workStatus (SW/W/WF/SWF/H), pickup,      */
/*      MU call, on-set time, transport mode                           */
/*    - "Send Call Sheet" actual distribution (button stubs status)    */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ClapperboardIcon as Clapperboard, ArrowLeft, Send, CheckCircle2,
  AlertTriangle, Plus, Trash2, Save, Loader2,
  Clock, MapPin, FileText as NotesIcon, MoreHorizontal,
  CloudSun, HeartPulse, Download,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { useAuthStore } from '@/store/auth';
import { callSheetsApi } from '@/services/callSheets';
import type {
  CallSheet, CallSheetStatus, CallSheetType, CallStatus,
} from '@/types/callSheet';
import { DEPARTMENTS } from '@/constants/departments';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical contract.                                      */
/* ------------------------------------------------------------------ */
const STATUS_LABEL: Record<CallSheetStatus, string> = {
  DRAFT: 'Draft', READY: 'Siap', SENT: 'Terkirim', UPDATED: 'Diperbarui',
};
const STATUS_KEY: Record<CallSheetStatus, string> = {
  DRAFT:   'callSheets.statusDraft',
  READY:   'callSheets.statusReady',
  SENT:    'callSheets.statusSent',
  UPDATED: 'callSheets.statusUpdated',
};
const statusChipClass = (s?: string) => {
  switch (s) {
    case 'SENT':    return 'bg-success/10 text-success border-success/30';
    case 'READY':   return 'bg-info/10 text-info border-info/30';
    case 'UPDATED': return 'bg-warning/12 text-warning border-warning/30';
    case 'DRAFT':
    default:        return 'bg-bg-sunken text-text-tertiary border-border-subtle';
  }
};

const TYPE_LABEL: Record<CallSheetType, string> = { FILM: 'Film', PHOTO: 'Foto' };
const TYPE_KEY: Record<CallSheetType, string> = {
  FILM:  'callSheets.typeFilm',
  PHOTO: 'callSheets.typePhoto',
};

const CAST_STATUS_LABEL: Record<CallStatus, string> = {
  PENDING:   'Menunggu',
  CONFIRMED: 'Konfirmasi',
  ON_SET:    'Di Lokasi',
  WRAPPED:   'Selesai',
};
const CAST_STATUS_KEY: Record<CallStatus, string> = {
  PENDING:   'callSheetEditor.castStatusPending',
  CONFIRMED: 'callSheetEditor.castStatusConfirmed',
  ON_SET:    'callSheetEditor.castStatusOnSet',
  WRAPPED:   'callSheetEditor.castStatusWrapped',
};

const ACTIVITY_TYPES: { value: string; labelKey: string; labelFallback: string }[] = [
  { value: 'GENERAL',     labelKey: 'callSheetEditor.activityGeneral',     labelFallback: 'General' },
  { value: 'PREPARATION', labelKey: 'callSheetEditor.activityPreparation', labelFallback: 'Preparation' },
  { value: 'STANDBY',     labelKey: 'callSheetEditor.activityStandby',     labelFallback: 'Standby' },
  { value: 'BRIEFING',    labelKey: 'callSheetEditor.activityBriefing',    labelFallback: 'Briefing' },
  { value: 'REHEARSAL',   labelKey: 'callSheetEditor.activityRehearsal',   labelFallback: 'Rehearsal' },
  { value: 'TRANSPORT',   labelKey: 'callSheetEditor.activityTransport',   labelFallback: 'Transport' },
  { value: 'TECHNICAL',   labelKey: 'callSheetEditor.activityTechnical',   labelFallback: 'Technical' },
  { value: 'CUSTOM',      labelKey: 'callSheetEditor.activityCustom',      labelFallback: 'Custom' },
];

/* ------------------------------------------------------------------ */
/*  Form shape — covers the editable subset. The detail relations      */
/*  (castCalls, crewCalls, activities) are handled inline via          */
/*  useFieldArray so add/remove maps directly to API mutations.        */
/* ------------------------------------------------------------------ */

type CallSheetHeaderForm = {
  productionName: string;
  director: string;
  producer: string;
  callSheetType: CallSheetType;
  crewCallTime: string;
  firstShotTime: string;
  lunchTime: string;
  estimatedWrap: string;
  sunrise: string;
  sunset: string;
  locationName: string;
  locationAddress: string;
  parkingNotes: string;
  weatherHigh: string;
  weatherLow: string;
  weatherCondition: string;
  nearestHospital: string;
  hospitalAddress: string;
  hospitalPhone: string;
  generalNotes: string;
  productionNotes: string;
};

/* Editable arrays — separate form so we can wire react-hook-form
   useFieldArray without polluting the header save loop. */
type CrewRowForm = {
  id?: string;            // present = existing, absent = new (unsaved)
  department: string;
  position: string;
  name: string;
  callTime: string;
  phone: string;
  email: string;
};

type CastRowForm = {
  id?: string;
  castNumber: string;
  actorName: string;
  character: string;
  callTime: string;
  status: CallStatus;
};

type ActivityRowForm = {
  id?: string;
  activityType: string;
  activityName: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallSheetEditorPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /* ----- data ----- */
  const { data: callSheet, isLoading, error, refetch } = useQuery({
    queryKey: ['call-sheet', id],
    queryFn: () => callSheetsApi.getById(id!),
    enabled: !!id,
  });

  /* ----- header form ----- */
  const headerForm = useForm<CallSheetHeaderForm>({
    defaultValues: {
      productionName: '', director: '', producer: '', callSheetType: 'PHOTO',
      crewCallTime: '', firstShotTime: '', lunchTime: '', estimatedWrap: '',
      sunrise: '', sunset: '',
      locationName: '', locationAddress: '', parkingNotes: '',
      weatherHigh: '', weatherLow: '', weatherCondition: '',
      nearestHospital: '', hospitalAddress: '', hospitalPhone: '',
      generalNotes: '', productionNotes: '',
    },
    mode: 'onBlur',
  });

  // Reset form whenever data arrives. Strings are coerced because the
  // backend mixes numeric weather fields with strings everywhere else.
  useEffect(() => {
    if (!callSheet) return;
    headerForm.reset({
      productionName: callSheet.productionName ?? '',
      director: callSheet.director ?? '',
      producer: callSheet.producer ?? '',
      callSheetType: callSheet.callSheetType ?? 'PHOTO',
      crewCallTime: callSheet.crewCallTime ?? callSheet.generalCallTime ?? '',
      firstShotTime: callSheet.firstShotTime ?? '',
      lunchTime: callSheet.lunchTime ?? '',
      estimatedWrap: callSheet.estimatedWrap ?? callSheet.wrapTime ?? '',
      sunrise: callSheet.sunrise ?? '',
      sunset: callSheet.sunset ?? '',
      locationName: callSheet.locationName ?? '',
      locationAddress: callSheet.locationAddress ?? '',
      parkingNotes: callSheet.parkingNotes ?? '',
      weatherHigh: callSheet.weatherHigh != null ? String(callSheet.weatherHigh) : '',
      weatherLow: callSheet.weatherLow != null ? String(callSheet.weatherLow) : '',
      weatherCondition: callSheet.weatherCondition ?? '',
      nearestHospital: callSheet.nearestHospital ?? '',
      hospitalAddress: callSheet.hospitalAddress ?? '',
      hospitalPhone: callSheet.hospitalPhone ?? '',
      generalNotes: callSheet.generalNotes ?? '',
      productionNotes: callSheet.productionNotes ?? '',
    });
  }, [callSheet, headerForm]);

  /* ----- arrays form (crew/cast/activities) ----- */
  // Kept separate so the "Save Header" button doesn't get tangled with
  // per-row add/remove flows (which fire dedicated endpoints).
  const arraysForm = useForm<{
    crew: CrewRowForm[];
    cast: CastRowForm[];
    activities: ActivityRowForm[];
  }>({
    defaultValues: { crew: [], cast: [], activities: [] },
  });

  useEffect(() => {
    if (!callSheet) return;
    arraysForm.reset({
      crew: (callSheet.crewCalls ?? []).map((c) => ({
        id: c.id,
        department: c.department,
        position: c.position,
        name: c.name,
        callTime: c.callTime,
        phone: c.phone ?? '',
        email: c.email ?? '',
      })),
      cast: (callSheet.castCalls ?? []).map((c) => ({
        id: c.id,
        castNumber: c.castNumber ?? '',
        actorName: c.actorName,
        character: c.character ?? '',
        callTime: c.callTime,
        status: c.status,
      })),
      activities: (callSheet.activities ?? []).map((a) => ({
        id: a.id,
        activityType: a.activityType ?? 'GENERAL',
        activityName: a.activityName,
        startTime: a.startTime,
        endTime: a.endTime ?? '',
        location: a.location ?? '',
        notes: a.notes ?? '',
      })),
    });
  }, [callSheet, arraysForm]);

  const crewArray = useFieldArray({ control: arraysForm.control, name: 'crew' });
  const castArray = useFieldArray({ control: arraysForm.control, name: 'cast' });
  const activityArray = useFieldArray({ control: arraysForm.control, name: 'activities' });

  /* ----- mutations ----- */
  const updateMutation = useMutation({
    mutationFn: (dto: Partial<CallSheet>) => callSheetsApi.update(id!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.saved', 'Perubahan tersimpan.'));
    },
    onError: () => toast.error(t('callSheets.editor.saveFailed', 'Gagal menyimpan.')),
  });

  const addCrew = useMutation({
    mutationFn: (row: CrewRowForm) =>
      callSheetsApi.addCrew(id!, {
        department: row.department,
        position: row.position,
        name: row.name,
        callTime: row.callTime || '7:00 AM',
        phone: row.phone || undefined,
        email: row.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.crewAdded', 'Kru ditambahkan.'));
    },
    onError: () => toast.error(t('callSheets.editor.crewAddFailed', 'Gagal menambah kru.')),
  });
  const updateCrew = useMutation({
    mutationFn: ({ crewId, dto }: { crewId: string; dto: Partial<CrewRowForm> }) =>
      callSheetsApi.updateCrew(crewId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheets.editor.crewUpdateFailed', 'Gagal memperbarui kru.')),
  });
  const removeCrew = useMutation({
    mutationFn: (crewId: string) => callSheetsApi.removeCrew(crewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.crewRemoved', 'Kru dihapus.'));
    },
    onError: () => toast.error(t('callSheets.editor.crewRemoveFailed', 'Gagal menghapus kru.')),
  });

  const addCast = useMutation({
    mutationFn: (row: CastRowForm) =>
      callSheetsApi.addCast(id!, {
        actorName: row.actorName,
        character: row.character || undefined,
        callTime: row.callTime || '8:00 AM',
        castNumber: row.castNumber || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.castAdded', 'Talent ditambahkan.'));
    },
    onError: () => toast.error(t('callSheets.editor.castAddFailed', 'Gagal menambah talent.')),
  });
  const updateCast = useMutation({
    mutationFn: ({ castId, dto }: { castId: string; dto: Partial<CastRowForm> }) =>
      callSheetsApi.updateCast(castId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheets.editor.castUpdateFailed', 'Gagal memperbarui talent.')),
  });
  const removeCast = useMutation({
    mutationFn: (castId: string) => callSheetsApi.removeCast(castId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.castRemoved', 'Talent dihapus.'));
    },
    onError: () => toast.error(t('callSheets.editor.castRemoveFailed', 'Gagal menghapus talent.')),
  });

  const addActivity = useMutation({
    mutationFn: (row: ActivityRowForm) =>
      callSheetsApi.addActivity(id!, {
        activityType: (row.activityType || 'GENERAL') as any,
        activityName: row.activityName,
        startTime: row.startTime || '8:00 AM',
        endTime: row.endTime || undefined,
        location: row.location || undefined,
        notes: row.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.activityAdded', 'Jadwal ditambahkan.'));
    },
    onError: () => toast.error(t('callSheets.editor.activityAddFailed', 'Gagal menambah jadwal.')),
  });
  const updateActivity = useMutation({
    mutationFn: ({ actId, dto }: { actId: string; dto: Partial<ActivityRowForm> }) =>
      callSheetsApi.updateActivity(actId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheets.editor.activityUpdateFailed', 'Gagal memperbarui jadwal.')),
  });
  const removeActivity = useMutation({
    mutationFn: (actId: string) => callSheetsApi.removeActivity(actId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheets.editor.activityRemoved', 'Jadwal dihapus.'));
    },
    onError: () => toast.error(t('callSheets.editor.activityRemoveFailed', 'Gagal menghapus jadwal.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => callSheetsApi.delete(id!),
    onSuccess: () => {
      toast.success(t('callSheets.deleted', 'Call sheet berhasil dihapus.'));
      navigate('/call-sheets');
    },
    onError: () => toast.error(t('callSheets.deleteFailed', 'Gagal menghapus call sheet.')),
  });

  /* ----- header dto builder (shared by header + save-all) ----- */
  const buildHeaderDto = (values: CallSheetHeaderForm): Partial<CallSheet> => {
    const toNumOrUndef = (v: string) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      productionName: values.productionName || undefined,
      director: values.director || undefined,
      producer: values.producer || undefined,
      callSheetType: values.callSheetType,
      crewCallTime: values.crewCallTime || undefined,
      firstShotTime: values.firstShotTime || undefined,
      lunchTime: values.lunchTime || undefined,
      estimatedWrap: values.estimatedWrap || undefined,
      sunrise: values.sunrise || undefined,
      sunset: values.sunset || undefined,
      locationName: values.locationName || undefined,
      locationAddress: values.locationAddress || undefined,
      parkingNotes: values.parkingNotes || undefined,
      weatherHigh: toNumOrUndef(values.weatherHigh),
      weatherLow: toNumOrUndef(values.weatherLow),
      weatherCondition: values.weatherCondition || undefined,
      nearestHospital: values.nearestHospital || undefined,
      hospitalAddress: values.hospitalAddress || undefined,
      hospitalPhone: values.hospitalPhone || undefined,
      generalNotes: values.generalNotes || undefined,
      productionNotes: values.productionNotes || undefined,
    };
  };

  /* ----- save EVERYTHING as one call sheet ----- */
  // The whole sheet is persisted in one action: header fields plus every
  // crew/cast/activity row (new rows are created, existing rows updated).
  // This is what "save as one unit" means — no more silently-dropped rows.
  const [isSavingAll, setIsSavingAll] = useState(false);
  const handleSaveAll = async () => {
    if (!id) return;
    setIsSavingAll(true);
    try {
      await callSheetsApi.update(id, buildHeaderDto(headerForm.getValues()));

      const { crew, cast, activities } = arraysForm.getValues();

      for (const row of crew) {
        if (!row.department || !row.position || !row.name) continue;
        const dto = {
          department: row.department,
          position: row.position,
          name: row.name,
          callTime: row.callTime || '7:00 AM',
          phone: row.phone || undefined,
          email: row.email || undefined,
        };
        if (row.id) await callSheetsApi.updateCrew(row.id, dto as any);
        else await callSheetsApi.addCrew(id, dto);
      }

      for (const row of cast) {
        if (!row.actorName) continue;
        if (row.id) {
          await callSheetsApi.updateCast(row.id, {
            actorName: row.actorName,
            character: row.character || undefined,
            callTime: row.callTime || '8:00 AM',
            castNumber: row.castNumber || undefined,
            status: row.status,
          } as any);
        } else {
          await callSheetsApi.addCast(id, {
            actorName: row.actorName,
            character: row.character || undefined,
            callTime: row.callTime || '8:00 AM',
            castNumber: row.castNumber || undefined,
          });
        }
      }

      for (const row of activities) {
        if (!row.activityName) continue;
        const dto = {
          activityType: (row.activityType || 'GENERAL') as any,
          activityName: row.activityName,
          startTime: row.startTime || '8:00 AM',
          endTime: row.endTime || undefined,
          location: row.location || undefined,
          notes: row.notes || undefined,
        };
        if (row.id) await callSheetsApi.updateActivity(row.id, dto as any);
        else await callSheetsApi.addActivity(id, dto);
      }

      await queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      // Clear the dirty flag so the bar reflects the saved state.
      headerForm.reset(headerForm.getValues());
      toast.success(t('callSheetEditor.savedAll', 'Call sheet tersimpan.'));
    } catch {
      toast.error(t('callSheetEditor.saveAllFailed', 'Gagal menyimpan call sheet.'));
    } finally {
      setIsSavingAll(false);
    }
  };

  /* ----- status workflow ----- */
  const handleStatusChange = (next: CallSheetStatus) => {
    updateMutation.mutate({ status: next });
  };
  const handleDelete = () => {
    if (!callSheet) return;
    if (window.confirm(t(
      'callSheets.editor.confirmDelete',
      `Hapus call sheet "${callSheet.productionName || `#${callSheet.callSheetNumber}`}"?`,
    ))) {
      deleteMutation.mutate();
    }
  };

  /* ----- PDF download ----- */
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadPdf = useCallback(async () => {
    if (!id) return;
    setIsDownloadingPdf(true);
    try {
      const blob = await callSheetsApi.generatePDF(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-sheet-${callSheet?.productionName ?? id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('callSheets.editor.pdfDownloaded', 'PDF berhasil diunduh.'));
    } catch {
      toast.error(t('callSheets.editor.pdfFailed', 'Gagal mengunduh PDF.'));
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [id, callSheet, t]);

  /* ----- derived ----- */
  const statusKey = (callSheet?.status ?? 'DRAFT') as CallSheetStatus;
  const hasLocation = useMemo(
    () => Boolean(callSheet?.locationAddress || callSheet?.locationName),
    [callSheet?.locationAddress, callSheet?.locationName],
  );

  /* ----- shell wrapper ----- */
  const shell = (children: React.ReactNode) => (
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

  /* ----- loading ----- */
  if (isLoading) {
    return shell(
      <>
        <div className="mb-10">
          <Skeleton className="h-4 w-40 mb-3 rounded" />
          <Skeleton className="h-10 w-80 mb-3 rounded" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      </>,
    );
  }

  /* ----- error ----- */
  if (error || !callSheet) {
    return shell(
      <EmptyState
        icon={<Clapperboard className="h-12 w-12" />}
        title={t('callSheets.editor.error.title', 'Call sheet tidak ditemukan')}
        description={
          error instanceof Error
            ? error.message
            : t(
                'callSheets.editor.error.desc',
                'Call sheet yang Anda cari mungkin sudah dihapus atau terjadi kesalahan.',
              )
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/call-sheets')}>
              <ArrowLeft className="h-4 w-4" />
              {t('common.back', 'Back')}
            </Button>
            <Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>
          </div>
        }
      />,
    );
  }

  /* ----- primary CTA — state-driven (one button per status) ----- */
  const renderPrimaryAction = () => {
    if (statusKey === 'DRAFT') {
      return (
        <Button
          size="sm"
          onClick={() => handleStatusChange('READY')}
          disabled={updateMutation.isPending}
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('callSheets.editor.markReady', 'Tandai Siap')}
        </Button>
      );
    }
    if (statusKey === 'READY' || statusKey === 'UPDATED') {
      return (
        <Button
          size="sm"
          onClick={() => handleStatusChange('SENT')}
          disabled={updateMutation.isPending}
        >
          <Send className="h-4 w-4" />
          {t('callSheets.editor.send', 'Tandai Terkirim')}
        </Button>
      );
    }
    // SENT
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleStatusChange('UPDATED')}
        disabled={updateMutation.isPending}
        className="border-warning/40 text-warning hover:bg-warning/10"
      >
        <AlertTriangle className="h-4 w-4" />
        {t('callSheets.editor.markUpdated', 'Tandai Diperbarui')}
      </Button>
    );
  };

  /* ----- render ----- */
  return shell(
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('callSheets.title', 'Call Sheet'), href: '/call-sheets' },
          { label: callSheet.productionName || `#${callSheet.callSheetNumber}` },
        ]}
        title={callSheet.productionName || `Call Sheet #${callSheet.callSheetNumber}`}
        description={[
          // PageHeader.description is a string slot — assemble Bahasa
          // shoot-date + day-context as a single sentence so the visual
          // weight matches other v2 detail pages.
          callSheet.shootDate
            ? new Date(callSheet.shootDate).toLocaleDateString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })
            : null,
          callSheet.dayNumber
            ? (callSheet.totalDays
                ? t('callSheetEditor.dayOf', 'Day {{day}} of {{total}}', { day: callSheet.dayNumber, total: callSheet.totalDays })
                : t('callSheetEditor.day', 'Day {{day}}', { day: callSheet.dayNumber }))
            : null,
        ].filter(Boolean).join(' · ')}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5',
                'text-[11px] font-medium tracking-tight',
                statusChipClass(callSheet.status),
              )}
            >
              {t(STATUS_KEY[statusKey], STATUS_LABEL[statusKey])}
            </span>
            {renderPrimaryAction()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.actions', 'Actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                >
                  {isDownloadingPdf
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  {t('callSheetEditor.downloadPdf', 'Download PDF')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Mobile notice — editing is best on tablet or desktop */}
      <div className="md:hidden mb-5 rounded-md border border-warning/30 bg-warning/[0.06] px-3.5 py-2.5 text-xs text-warning">
        {t('common.mobileNotice', 'Best editing experience on tablet or desktop. Some controls may be hidden on small screens.')}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* ============================================================ */}
        {/* LEFT — section stack                                         */}
        {/* ============================================================ */}
        <div className="space-y-4 min-w-0">
          {/* ──── General ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowIdentity', 'Identity')}
            title={t('callSheetEditor.sectionProduction', 'Production Info')}
            description={t('callSheetEditor.sectionProductionDesc', 'Production name, director, producer, and call sheet type.')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={t('callSheetEditor.fieldProductionName', 'Production Name')}>
                <Input
                  {...headerForm.register('productionName')}
                  placeholder="misal: Kampanye Brand 2026"
                  className="bg-bg-sunken border-border-default"
                />
              </Field>
              <Field label={t('callSheetEditor.fieldType', 'Type')}>
                <Controller
                  control={headerForm.control}
                  name="callSheetType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-bg-sunken border-border-default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PHOTO">{t(TYPE_KEY.PHOTO, TYPE_LABEL.PHOTO)}</SelectItem>
                        <SelectItem value="FILM">{t(TYPE_KEY.FILM, TYPE_LABEL.FILM)}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label={t('callSheetEditor.fieldDirector', 'Director')}>
                <Input
                  {...headerForm.register('director')}
                  placeholder={t('callSheetEditor.directorPlaceholder', 'Director name')}
                  className="bg-bg-sunken border-border-default"
                />
              </Field>
              <Field label={t('callSheetEditor.fieldProducer', 'Producer')}>
                <Input
                  {...headerForm.register('producer')}
                  placeholder={t('callSheetEditor.producerPlaceholder', 'Producer name')}
                  className="bg-bg-sunken border-border-default"
                />
              </Field>
            </div>
          </FormSection>

          {/* ──── Times ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowSchedule', 'Core Schedule')}
            title={t('callSheetEditor.sectionCallTimes', 'Call Times')}
            description={t('callSheetEditor.sectionCallTimesDesc', 'Free-form format (e.g. "7:00 AM"). Displayed as-is in the v1 PDF.')}
            icon={<Clock className="h-4 w-4" />}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={t('callSheetEditor.fieldCrewCall', 'Crew Call')}><TimeInput {...headerForm.register('crewCallTime')} /></Field>
              <Field label={t('callSheetEditor.fieldFirstShot', 'First Shot')}><TimeInput {...headerForm.register('firstShotTime')} /></Field>
              <Field label={t('callSheetEditor.fieldLunch', 'Lunch')}><TimeInput {...headerForm.register('lunchTime')} /></Field>
              <Field label={t('callSheetEditor.fieldEstWrap', 'Est. Wrap')}><TimeInput {...headerForm.register('estimatedWrap')} /></Field>
              <Field label={t('callSheetEditor.fieldSunrise', 'Sunrise')}><TimeInput {...headerForm.register('sunrise')} /></Field>
              <Field label={t('callSheetEditor.fieldSunset', 'Sunset')}><TimeInput {...headerForm.register('sunset')} /></Field>
            </div>
          </FormSection>

          {/* ──── Location / Weather / Hospital ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowLocation', 'Location & Weather')}
            title={t('callSheetEditor.sectionLocation', 'Shoot Location')}
            description={t('callSheetEditor.sectionLocationDesc', 'Address, parking, weather, and nearest hospital. Weather/hospital auto-fill is in the classic editor.')}
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={t('callSheetEditor.fieldLocationName', 'Location Name')}>
                  <Input
                    {...headerForm.register('locationName')}
                    placeholder={t('callSheetEditor.locationNamePlaceholder', 'E.g. South Studio')}
                    className="bg-bg-sunken border-border-default"
                  />
                </Field>
                <Field label={t('callSheetEditor.fieldAddress', 'Address')}>
                  <Input
                    {...headerForm.register('locationAddress')}
                    placeholder={t('callSheetEditor.addressPlaceholder', 'Jl. Sudirman No. 123, Jakarta')}
                    className="bg-bg-sunken border-border-default"
                  />
                </Field>
              </div>
              <Field label={t('callSheetEditor.fieldParkingNotes', 'Parking Notes')}>
                <textarea
                  {...headerForm.register('parkingNotes')}
                  rows={2}
                  placeholder={t('callSheetEditor.parkingPlaceholder', 'Parking instructions for crew...')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </Field>

              <Separator className="bg-border-subtle" />

              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">
                  <CloudSun className="h-3.5 w-3.5" />
                  {t('callSheetEditor.sectionWeather', 'Weather')}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Field label={t('callSheetEditor.fieldWeatherHigh', 'High (°F)')}>
                    <Input
                      type="number"
                      {...headerForm.register('weatherHigh')}
                      className="bg-bg-sunken border-border-default tabular-nums"
                    />
                  </Field>
                  <Field label={t('callSheetEditor.fieldWeatherLow', 'Low (°F)')}>
                    <Input
                      type="number"
                      {...headerForm.register('weatherLow')}
                      className="bg-bg-sunken border-border-default tabular-nums"
                    />
                  </Field>
                  <Field label={t('callSheetEditor.fieldWeatherCondition', 'Condition')}>
                    <Input
                      {...headerForm.register('weatherCondition')}
                      placeholder={t('callSheetEditor.weatherConditionPlaceholder', 'Sunny / Cloudy')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </Field>
                </div>
              </div>

              <Separator className="bg-border-subtle" />

              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">
                  <HeartPulse className="h-3.5 w-3.5" />
                  {t('callSheetEditor.sectionHospital', 'Nearest Hospital')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label={t('callSheetEditor.fieldHospitalName', 'Name')}>
                    <Input
                      {...headerForm.register('nearestHospital')}
                      placeholder={t('callSheetEditor.hospitalNamePlaceholder', 'Hospital name')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </Field>
                  <Field label={t('callSheetEditor.fieldHospitalAddress', 'Address')}>
                    <Input
                      {...headerForm.register('hospitalAddress')}
                      placeholder={t('callSheetEditor.hospitalAddressPlaceholder', 'Hospital address')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </Field>
                  <Field label={t('callSheetEditor.fieldHospitalPhone', 'Phone')}>
                    <Input
                      {...headerForm.register('hospitalPhone')}
                      placeholder={t('callSheetEditor.hospitalPhonePlaceholder', '(021) ...')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </FormSection>

          {/* ──── Schedule (activities) ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowRunOfShow', 'Run of Show')}
            title={t('callSheetEditor.sectionActivities', 'Activity Schedule')}
            description={t('callSheetEditor.sectionActivitiesDesc', 'Activity lineup for shoot day. Use "Add" to save rows to the server.')}
            icon={<Clock className="h-4 w-4" />}
          >
            {activityArray.fields.length === 0 ? (
              <p className="text-sm text-text-tertiary italic mb-4">
                {t('callSheetEditor.noActivities', 'No scheduled activities yet.')}
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {/* Header row — desktop only */}
                <div className="hidden sm:grid grid-cols-[110px_1fr_90px_90px_140px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <div>{t('callSheetEditor.colType', 'Type')}</div>
                  <div>{t('callSheetEditor.colActivity', 'Activity')}</div>
                  <div>{t('callSheetEditor.colStart', 'Start')}</div>
                  <div>{t('callSheetEditor.colEnd', 'End')}</div>
                  <div>{t('callSheetEditor.colLocation', 'Location')}</div>
                  <div />
                </div>
                <div className="divide-y divide-border-subtle">
                  {activityArray.fields.map((field, idx) => {
                    const row = arraysForm.watch(`activities.${idx}`);
                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[110px_1fr_90px_90px_140px_32px] gap-2 py-2 items-center"
                      >
                        <Controller
                          control={arraysForm.control}
                          name={`activities.${idx}.activityType`}
                          render={({ field: f }) => (
                            <Select
                              value={f.value}
                              onValueChange={(v) => {
                                f.onChange(v);
                                if (row?.id) {
                                  updateActivity.mutate({
                                    actId: row.id,
                                    dto: { activityType: v },
                                  });
                                }
                              }}
                            >
                              <SelectTrigger
                                size="sm"
                                className="bg-bg-sunken border-border-subtle text-xs"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTIVITY_TYPES.map((at) => (
                                  <SelectItem key={at.value} value={at.value}>
                                    {t(at.labelKey, at.labelFallback)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Input
                          {...arraysForm.register(`activities.${idx}.activityName`)}
                          placeholder={t('callSheetEditor.activityNamePlaceholder', 'Activity name')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateActivity.mutate({
                                actId: row.id,
                                dto: { activityName: e.target.value },
                              });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <Input
                          {...arraysForm.register(`activities.${idx}.startTime`)}
                          placeholder={t('callSheetEditor.startTimePlaceholder', '8:00 AM')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateActivity.mutate({
                                actId: row.id,
                                dto: { startTime: e.target.value },
                              });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                        />
                        <Input
                          {...arraysForm.register(`activities.${idx}.endTime`)}
                          placeholder={t('callSheetEditor.endTimePlaceholder', '9:00 AM')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateActivity.mutate({
                                actId: row.id,
                                dto: { endTime: e.target.value },
                              });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                        />
                        <Input
                          {...arraysForm.register(`activities.${idx}.location`)}
                          placeholder={t('callSheetEditor.locationOptionalPlaceholder', 'Location (optional)')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateActivity.mutate({
                                actId: row.id,
                                dto: { location: e.target.value },
                              });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <RowActions
                          isSaved={!!row?.id}
                          onSave={() => {
                            if (!row.activityName) {
                              toast.error(t('callSheetEditor.activityNameRequired', 'Activity name is required.'));
                              return;
                            }
                            addActivity.mutate(row);
                          }}
                          onRemove={() => {
                            if (row?.id) removeActivity.mutate(row.id);
                            else activityArray.remove(idx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                activityArray.append({
                  activityType: 'GENERAL',
                  activityName: '',
                  startTime: '',
                  endTime: '',
                  location: '',
                  notes: '',
                })
              }
              className="border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('callSheetEditor.addActivity', 'Add Activity')}
            </Button>
          </FormSection>

          {/* ──── Crew ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowProductionTeam', 'Production Team')}
            title={t('callSheetEditor.sectionCrew', 'Crew')}
            description={t('callSheetEditor.sectionCrewDesc', 'Crew list with department, position, and call time.')}
            icon={<Users className="h-4 w-4" />}
          >
            {crewArray.fields.length === 0 ? (
              <p className="text-sm text-text-tertiary italic mb-4">
                {t('callSheetEditor.noCrew', 'No crew yet. Click "Add Crew" to get started.')}
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                <div className="hidden sm:grid grid-cols-[130px_140px_1fr_100px_140px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <div>{t('callSheetEditor.colDept', 'Dept.')}</div>
                  <div>{t('callSheetEditor.colPosition', 'Position')}</div>
                  <div>{t('callSheetEditor.colName', 'Name')}</div>
                  <div>{t('callSheetEditor.colCall', 'Call')}</div>
                  <div>{t('callSheetEditor.colPhone', 'Phone')}</div>
                  <div />
                </div>
                <div className="divide-y divide-border-subtle">
                  {crewArray.fields.map((field, idx) => {
                    const row = arraysForm.watch(`crew.${idx}`);
                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[130px_140px_1fr_100px_140px_32px] gap-2 py-2 items-center"
                      >
                        <Controller
                          control={arraysForm.control}
                          name={`crew.${idx}.department`}
                          render={({ field: f }) => (
                            <Select
                              value={f.value || undefined}
                              onValueChange={(v) => {
                                f.onChange(v);
                                if (row?.id) {
                                  updateCrew.mutate({ crewId: row.id, dto: { department: v } });
                                }
                              }}
                            >
                              <SelectTrigger
                                size="sm"
                                className="bg-bg-sunken border-border-subtle text-xs"
                              >
                                <SelectValue placeholder={t('callSheetEditor.deptPlaceholder', 'Dept.')} />
                              </SelectTrigger>
                              <SelectContent>
                                {DEPARTMENTS.map((d) => (
                                  <SelectItem key={d.value} value={d.value}>
                                    {d.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Input
                          {...arraysForm.register(`crew.${idx}.position`)}
                          placeholder={t('callSheetEditor.positionPlaceholder', 'Position')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCrew.mutate({ crewId: row.id, dto: { position: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <Input
                          {...arraysForm.register(`crew.${idx}.name`)}
                          placeholder={t('callSheetEditor.namePlaceholder', 'Name')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCrew.mutate({ crewId: row.id, dto: { name: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <Input
                          {...arraysForm.register(`crew.${idx}.callTime`)}
                          placeholder={t('callSheetEditor.crewCallTimePlaceholder', '7:00 AM')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCrew.mutate({ crewId: row.id, dto: { callTime: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                        />
                        <Input
                          {...arraysForm.register(`crew.${idx}.phone`)}
                          placeholder={t('callSheetEditor.phonePlaceholder', '0812-...')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCrew.mutate({ crewId: row.id, dto: { phone: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                        />
                        <RowActions
                          isSaved={!!row?.id}
                          onSave={() => {
                            if (!row.department || !row.position || !row.name) {
                              toast.error(t('callSheetEditor.crewRequiredFields', 'Department, position, and name are required.'));
                              return;
                            }
                            addCrew.mutate(row);
                          }}
                          onRemove={() => {
                            if (row?.id) removeCrew.mutate(row.id);
                            else crewArray.remove(idx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                crewArray.append({
                  department: '',
                  position: '',
                  name: '',
                  callTime: '',
                  phone: '',
                  email: '',
                })
              }
              className="border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('callSheetEditor.addCrew', 'Add Crew')}
            </Button>
          </FormSection>

          {/* ──── Talent / Cast ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowTalent', 'Talent')}
            title={callSheet.callSheetType === 'PHOTO' ? t('callSheetEditor.sectionTalentModel', 'Talent / Model') : t('callSheetEditor.sectionCast', 'Cast')}
            description={t('callSheetEditor.sectionTalentDesc', 'Talent list with number, name, character, and call time.')}
            icon={<Users className="h-4 w-4" />}
          >
            {castArray.fields.length === 0 ? (
              <p className="text-sm text-text-tertiary italic mb-4">
                {t('callSheetEditor.noTalent', 'No talent yet. Click "Add Talent" to get started.')}
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                <div className="hidden sm:grid grid-cols-[60px_1fr_1fr_100px_120px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <div>{t('callSheetEditor.colCastNumber', '#')}</div>
                  <div>{t('callSheetEditor.colName', 'Name')}</div>
                  <div>{t('callSheetEditor.colCharacter', 'Character')}</div>
                  <div>{t('callSheetEditor.colCall', 'Call')}</div>
                  <div>{t('callSheetEditor.colStatus', 'Status')}</div>
                  <div />
                </div>
                <div className="divide-y divide-border-subtle">
                  {castArray.fields.map((field, idx) => {
                    const row = arraysForm.watch(`cast.${idx}`);
                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 sm:grid-cols-[60px_1fr_1fr_100px_120px_32px] gap-2 py-2 items-center"
                      >
                        <Input
                          {...arraysForm.register(`cast.${idx}.castNumber`)}
                          placeholder="#"
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCast.mutate({ castId: row.id, dto: { castNumber: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm text-center tabular-nums"
                        />
                        <Input
                          {...arraysForm.register(`cast.${idx}.actorName`)}
                          placeholder={t('callSheetEditor.talentNamePlaceholder', 'Talent name')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCast.mutate({ castId: row.id, dto: { actorName: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <Input
                          {...arraysForm.register(`cast.${idx}.character`)}
                          placeholder={t('callSheetEditor.characterPlaceholder', 'Character / role')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCast.mutate({ castId: row.id, dto: { character: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm"
                        />
                        <Input
                          {...arraysForm.register(`cast.${idx}.callTime`)}
                          placeholder={t('callSheetEditor.castCallTimePlaceholder', '8:00 AM')}
                          onBlur={(e) => {
                            if (row?.id) {
                              updateCast.mutate({ castId: row.id, dto: { callTime: e.target.value } });
                            }
                          }}
                          className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                        />
                        <Controller
                          control={arraysForm.control}
                          name={`cast.${idx}.status`}
                          render={({ field: f }) => (
                            <Select
                              value={f.value}
                              onValueChange={(v) => {
                                f.onChange(v);
                                if (row?.id) {
                                  updateCast.mutate({
                                    castId: row.id,
                                    dto: { status: v as CallStatus },
                                  });
                                }
                              }}
                            >
                              <SelectTrigger
                                size="sm"
                                className="bg-bg-sunken border-border-subtle text-xs"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(CAST_STATUS_LABEL) as CallStatus[]).map((k) => (
                                  <SelectItem key={k} value={k}>
                                    {t(CAST_STATUS_KEY[k], CAST_STATUS_LABEL[k])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <RowActions
                          isSaved={!!row?.id}
                          onSave={() => {
                            if (!row.actorName) {
                              toast.error(t('callSheetEditor.talentNameRequired', 'Talent name is required.'));
                              return;
                            }
                            addCast.mutate(row);
                          }}
                          onRemove={() => {
                            if (row?.id) removeCast.mutate(row.id);
                            else castArray.remove(idx);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                castArray.append({
                  castNumber: '',
                  actorName: '',
                  character: '',
                  callTime: '',
                  status: 'PENDING',
                })
              }
              className="border-border-subtle text-text-secondary hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('callSheetEditor.addTalent', 'Add Talent')}
            </Button>
          </FormSection>

          {/* ──── Notes ──── */}
          <FormSection
            eyebrow={t('callSheetEditor.eyebrowNotes', 'Notes')}
            title={t('callSheetEditor.sectionNotes', 'General & Production Notes')}
            description={t('callSheetEditor.sectionNotesDesc', 'These notes appear at the end of the call sheet.')}
            icon={<NotesIcon className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={t('callSheetEditor.fieldGeneralNotes', 'General Notes')}>
                <textarea
                  rows={4}
                  {...headerForm.register('generalNotes')}
                  placeholder={t('callSheetEditor.generalNotesPlaceholder', 'General notes for crew...')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </Field>
              <Field label={t('callSheetEditor.fieldProductionNotes', 'Production Notes')}>
                <textarea
                  rows={4}
                  {...headerForm.register('productionNotes')}
                  placeholder={t('callSheetEditor.productionNotesPlaceholder', 'Important production notes...')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </Field>
            </div>
          </FormSection>
        </div>

        {/* ============================================================ */}
        {/* RIGHT — sticky summary rail                                  */}
        {/* ============================================================ */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <GlassPanel surface="strong" padding="lg">
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-4">
              {t('callSheetEditor.summaryTitle', 'Summary')}
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryNumber', 'Number')}</dt>
                <dd className="font-mono text-text-primary tabular-nums">
                  #{callSheet.callSheetNumber}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryType', 'Type')}</dt>
                <dd className="text-text-secondary">
                  {callSheet.callSheetType ? t(TYPE_KEY[callSheet.callSheetType], TYPE_LABEL[callSheet.callSheetType]) : '—'}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryDay', 'Day')}</dt>
                <dd className="text-text-secondary tabular-nums">
                  {callSheet.dayNumber ?? '—'}
                  {callSheet.totalDays ? ` / ${callSheet.totalDays}` : ''}
                </dd>
              </div>
              <Separator className="bg-border-subtle" />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryCrew', 'Crew')}</dt>
                <dd className="text-text-secondary tabular-nums">
                  {callSheet.crewCalls?.length ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryTalent', 'Talent')}</dt>
                <dd className="text-text-secondary tabular-nums">
                  {callSheet.castCalls?.length ?? callSheet.models?.length ?? 0}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryActivities', 'Activities')}</dt>
                <dd className="text-text-secondary tabular-nums">
                  {callSheet.activities?.length ?? 0}
                </dd>
              </div>
              <Separator className="bg-border-subtle" />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-text-tertiary text-xs">{t('callSheetEditor.summaryUpdated', 'Updated')}</dt>
                <dd className="text-text-secondary text-xs text-right">
                  <DateDisplay date={callSheet.updatedAt} format="long" />
                </dd>
              </div>
            </dl>
          </GlassPanel>

          {!hasLocation && (
            <GlassPanel surface="subtle" padding="md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    {t('callSheetEditor.locationMissingTitle', 'Location not set')}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {t('callSheetEditor.locationMissingDesc', 'Add a shoot address so crew know where to go, and weather/hospital auto-fill (in v1) can run.')}
                  </p>
                </div>
              </div>
            </GlassPanel>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/* Sticky action bar — header save                              */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-text-tertiary">
            {headerForm.formState.isDirty
              ? t('callSheetEditor.unsavedChanges', 'Ada perubahan yang belum disimpan.')
              : t('callSheetEditor.savedAllChanges', 'Semua perubahan tersimpan.')}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/call-sheets')}
              className="text-text-secondary hover:text-text-primary"
            >
              {t('common.back', 'Back')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="min-w-[160px]"
            >
              {isSavingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('callSheetEditor.saveAll', 'Simpan Call Sheet')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>,
  );
}

/* ------------------------------------------------------------------ */
/*  Local presentational helpers                                       */
/* ------------------------------------------------------------------ */

const FormSection = ({
  eyebrow, title, description, icon, children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <GlassPanel surface="glass" padding="lg">
    <div className="mb-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
        {icon}
        {eyebrow}
      </div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">
          {description}
        </p>
      )}
    </div>
    {children}
  </GlassPanel>
);

const Field = ({
  label, children,
}: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
      {label}
    </Label>
    {children}
  </div>
);

/* Tiny time-string Input — kept as text on purpose (the backend stores
   freeform strings like "7:00 AM"). */
const TimeInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <Input
    placeholder="—"
    className="bg-bg-sunken border-border-default tabular-nums"
    {...props}
  />
);

/* Row save/remove pair — unsaved rows show Save, saved rows show only
   the trash icon (per-field updates fire onBlur). */
const RowActions = ({
  isSaved, onSave, onRemove,
}: { isSaved: boolean; onSave: () => void; onRemove: () => void }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-1">
      {!isSaved && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onSave}
          className="text-success hover:text-success hover:bg-success/10"
          aria-label={t('callSheetEditor.saveRow', 'Save row')}
        >
          <Save className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        className="text-text-tertiary hover:text-danger"
        aria-label={t('callSheetEditor.removeRow', 'Remove row')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
