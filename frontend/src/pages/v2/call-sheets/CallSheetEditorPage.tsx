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
/*  Conditional sections (rendered by callSheetType):                  */
/*    PHOTO → Models (arrival flow), Wardrobe, HMU schedule            */
/*    FILM  → Meal breaks, Company moves, Background/extras,           */
/*            Special requirements                                      */
/*  Location section carries auto-fill (weather / sun times /          */
/*  hospital / all), enabled once a location is saved.                 */
/*                                                                     */
/*  ── STILL DEFERRED (out of v2 scope for this pass) ──               */
/*    - PDF preview (export-to-PDF download IS wired, in the kebab)    */
/*    - Address autocomplete on the location field                     */
/*    - Drag-to-reorder for schedule and crew                          */
/*    - PHOTO shot list (looks)                                        */
/*    - Cast advanced fields: workStatus (SW/W/WF/SWF/H), pickup,      */
/*      MU call, on-set time, transport mode                           */
/*    - "Send Call Sheet" actual distribution (button stubs status)    */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ClapperboardIcon as Clapperboard, ArrowLeft, Send, CheckCircle2,
  AlertTriangle, Plus, Trash2, Save, Loader2,
  Clock, MapPin, FileText as NotesIcon, MoreHorizontal,
  CloudSun, HeartPulse, Download, Sunrise,
  Shirt, Sparkles, Utensils, Truck, UsersRound, ShieldAlert,
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
import { useGoogleMapsLoader } from '@/hooks/useGoogleMapsLoader';
import type {
  CallSheet, CallSheetStatus, CallSheetType, CallStatus,
  ModelArrivalType, WardrobeStatus, HMURole,
  MealType, SpecialReqType,
} from '@/types/callSheet';
import { DEPARTMENTS } from '@/constants/departments';

// Google Maps is loaded at runtime via useGoogleMapsLoader; type the global loosely.
declare global {
  interface Window {
    google?: any;
  }
}

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

/* ----- PHOTO / FILM enum option lists ----- */
const MODEL_ARRIVAL_TYPES: { value: ModelArrivalType; labelKey: string; labelFallback: string }[] = [
  { value: 'CAMERA_READY', labelKey: 'callSheetEditor.arrivalCameraReady', labelFallback: 'Camera Ready' },
  { value: 'STYLED',       labelKey: 'callSheetEditor.arrivalStyled',      labelFallback: 'Needs Styling' },
];

const WARDROBE_STATUSES: { value: WardrobeStatus; labelKey: string; labelFallback: string }[] = [
  { value: 'PENDING',   labelKey: 'callSheetEditor.wardrobePending',   labelFallback: 'Pending' },
  { value: 'CONFIRMED', labelKey: 'callSheetEditor.wardrobeConfirmed', labelFallback: 'Confirmed' },
  { value: 'ON_SET',    labelKey: 'callSheetEditor.wardrobeOnSet',     labelFallback: 'On Set' },
  { value: 'IN_USE',    labelKey: 'callSheetEditor.wardrobeInUse',     labelFallback: 'In Use' },
  { value: 'WRAPPED',   labelKey: 'callSheetEditor.wardrobeWrapped',   labelFallback: 'Wrapped' },
];

const HMU_ROLES: { value: HMURole; labelKey: string; labelFallback: string }[] = [
  { value: 'HAIR',        labelKey: 'callSheetEditor.hmuRoleHair',     labelFallback: 'Hair' },
  { value: 'MAKEUP',      labelKey: 'callSheetEditor.hmuRoleMakeup',   labelFallback: 'Makeup' },
  { value: 'BOTH',        labelKey: 'callSheetEditor.hmuRoleBoth',     labelFallback: 'Hair & Makeup' },
  { value: 'KEY_STYLIST', labelKey: 'callSheetEditor.hmuRoleKey',      labelFallback: 'Key Stylist' },
];

const MEAL_TYPES: { value: MealType; labelKey: string; labelFallback: string }[] = [
  { value: 'BREAKFAST',      labelKey: 'callSheetEditor.mealBreakfast',     labelFallback: 'Breakfast' },
  { value: 'LUNCH',          labelKey: 'callSheetEditor.mealLunch',         labelFallback: 'Lunch' },
  { value: 'SECOND_MEAL',    labelKey: 'callSheetEditor.mealSecond',        labelFallback: 'Second Meal' },
  { value: 'CRAFT_SERVICES', labelKey: 'callSheetEditor.mealCraft',         labelFallback: 'Craft Services' },
  { value: 'CATERING',       labelKey: 'callSheetEditor.mealCatering',      labelFallback: 'Catering' },
];

const SPECIAL_REQ_TYPES: { value: SpecialReqType; labelKey: string; labelFallback: string }[] = [
  { value: 'STUNTS',       labelKey: 'callSheetEditor.reqStunts',     labelFallback: 'Stunts' },
  { value: 'MINORS',       labelKey: 'callSheetEditor.reqMinors',     labelFallback: 'Minors' },
  { value: 'ANIMALS',      labelKey: 'callSheetEditor.reqAnimals',    labelFallback: 'Animals' },
  { value: 'VEHICLES',     labelKey: 'callSheetEditor.reqVehicles',   labelFallback: 'Vehicles' },
  { value: 'SFX_PYRO',     labelKey: 'callSheetEditor.reqSfxPyro',    labelFallback: 'SFX / Pyro' },
  { value: 'WATER_WORK',   labelKey: 'callSheetEditor.reqWaterWork',  labelFallback: 'Water Work' },
  { value: 'AERIAL_DRONE', labelKey: 'callSheetEditor.reqAerialDrone',labelFallback: 'Aerial / Drone' },
  { value: 'WEAPONS',      labelKey: 'callSheetEditor.reqWeapons',    labelFallback: 'Weapons' },
  { value: 'NUDITY',       labelKey: 'callSheetEditor.reqNudity',     labelFallback: 'Nudity' },
  { value: 'OTHER',        labelKey: 'callSheetEditor.reqOther',      labelFallback: 'Other' },
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
  locationLat: string;
  locationLng: string;
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

/* ----- PHOTO-specific row forms ----- */
type ModelRowForm = {
  id?: string;
  modelName: string;
  modelNumber: string;
  agencyName: string;
  arrivalType: ModelArrivalType;
  arrivalTime: string;
  hmuStartTime: string;
  cameraReadyTime: string;
  hmuArtist: string;
};

type WardrobeRowForm = {
  id?: string;
  itemName: string;
  brand: string;
  size: string;
  color: string;
  forModel: string;
  status: WardrobeStatus;
};

type HmuRowForm = {
  id?: string;
  artistName: string;
  artistRole: HMURole;
  callTime: string;
  availableFrom: string;
  availableUntil: string;
  assignedModels: string;
};

/* ----- FILM-specific row forms ----- */
type MealRowForm = {
  id?: string;
  mealType: MealType;
  time: string;
  duration: string;
  location: string;
  notes: string;
};

type MoveRowForm = {
  id?: string;
  departTime: string;
  fromLocation: string;
  toLocation: string;
  travelTime: string;
  notes: string;
};

type BackgroundRowForm = {
  id?: string;
  description: string;
  quantity: string;
  callTime: string;
  reportLocation: string;
  scenes: string;
};

type SpecialReqRowForm = {
  id?: string;
  reqType: SpecialReqType;
  description: string;
  contactName: string;
  contactPhone: string;
  safetyNotes: string;
};

type ArraysFormShape = {
  crew: CrewRowForm[];
  cast: CastRowForm[];
  activities: ActivityRowForm[];
  models: ModelRowForm[];
  wardrobe: WardrobeRowForm[];
  hmu: HmuRowForm[];
  meals: MealRowForm[];
  moves: MoveRowForm[];
  background: BackgroundRowForm[];
  specialReqs: SpecialReqRowForm[];
};

/* Single source of truth for turning a fetched CallSheet into the
   editable arrays-form shape. Used both by the reactive reset effect
   and by the post-save reset in handleSaveAll. */
function mapSheetToArrays(cs: CallSheet): ArraysFormShape {
  return {
    crew: (cs.crewCalls ?? []).map((c) => ({
      id: c.id,
      department: c.department,
      position: c.position,
      name: c.name,
      callTime: c.callTime,
      phone: c.phone ?? '',
      email: c.email ?? '',
    })),
    cast: (cs.castCalls ?? []).map((c) => ({
      id: c.id,
      castNumber: c.castNumber ?? '',
      actorName: c.actorName,
      character: c.character ?? '',
      callTime: c.callTime,
      status: c.status,
    })),
    activities: (cs.activities ?? []).map((a) => ({
      id: a.id,
      activityType: a.activityType ?? 'GENERAL',
      activityName: a.activityName,
      startTime: a.startTime,
      endTime: a.endTime ?? '',
      location: a.location ?? '',
      notes: a.notes ?? '',
    })),
    models: (cs.models ?? []).map((m) => ({
      id: m.id,
      modelName: m.modelName,
      modelNumber: m.modelNumber ?? '',
      agencyName: m.agencyName ?? '',
      arrivalType: m.arrivalType,
      arrivalTime: m.arrivalTime,
      hmuStartTime: m.hmuStartTime ?? '',
      cameraReadyTime: m.cameraReadyTime ?? '',
      hmuArtist: m.hmuArtist ?? '',
    })),
    wardrobe: (cs.wardrobe ?? []).map((w) => ({
      id: w.id,
      itemName: w.itemName,
      brand: w.brand ?? '',
      size: w.size ?? '',
      color: w.color ?? '',
      forModel: w.forModel ?? '',
      status: w.status,
    })),
    hmu: (cs.hmuSchedule ?? []).map((h) => ({
      id: h.id,
      artistName: h.artistName,
      artistRole: h.artistRole,
      callTime: h.callTime,
      availableFrom: h.availableFrom ?? '',
      availableUntil: h.availableUntil ?? '',
      assignedModels: h.assignedModels ?? '',
    })),
    meals: (cs.mealBreaks ?? []).map((m) => ({
      id: m.id,
      mealType: m.mealType,
      time: m.time,
      duration: m.duration != null ? String(m.duration) : '',
      location: m.location ?? '',
      notes: m.notes ?? '',
    })),
    moves: (cs.companyMoves ?? []).map((m) => ({
      id: m.id,
      departTime: m.departTime,
      fromLocation: m.fromLocation,
      toLocation: m.toLocation,
      travelTime: m.travelTime != null ? String(m.travelTime) : '',
      notes: m.notes ?? '',
    })),
    background: (cs.backgroundCalls ?? []).map((b) => ({
      id: b.id,
      description: b.description,
      quantity: b.quantity != null ? String(b.quantity) : '',
      callTime: b.callTime,
      reportLocation: b.reportLocation ?? '',
      scenes: b.scenes ?? '',
    })),
    specialReqs: (cs.specialRequirements ?? []).map((s) => ({
      id: s.id,
      reqType: s.reqType,
      description: s.description,
      contactName: s.contactName ?? '',
      contactPhone: s.contactPhone ?? '',
      safetyNotes: s.safetyNotes ?? '',
    })),
  };
}

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
      locationName: '', locationAddress: '', locationLat: '', locationLng: '', parkingNotes: '',
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
      locationLat: callSheet.locationLat != null ? String(callSheet.locationLat) : '',
      locationLng: callSheet.locationLng != null ? String(callSheet.locationLng) : '',
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
    models: ModelRowForm[];
    wardrobe: WardrobeRowForm[];
    hmu: HmuRowForm[];
    meals: MealRowForm[];
    moves: MoveRowForm[];
    background: BackgroundRowForm[];
    specialReqs: SpecialReqRowForm[];
  }>({
    defaultValues: {
      crew: [], cast: [], activities: [],
      models: [], wardrobe: [], hmu: [],
      meals: [], moves: [], background: [], specialReqs: [],
    },
  });

  useEffect(() => {
    if (!callSheet) return;
    arraysForm.reset(mapSheetToArrays(callSheet));
  }, [callSheet, arraysForm]);

  const crewArray = useFieldArray({ control: arraysForm.control, name: 'crew' });
  const castArray = useFieldArray({ control: arraysForm.control, name: 'cast' });
  const activityArray = useFieldArray({ control: arraysForm.control, name: 'activities' });
  const modelArray = useFieldArray({ control: arraysForm.control, name: 'models' });
  const wardrobeArray = useFieldArray({ control: arraysForm.control, name: 'wardrobe' });
  const hmuArray = useFieldArray({ control: arraysForm.control, name: 'hmu' });
  const mealArray = useFieldArray({ control: arraysForm.control, name: 'meals' });
  const moveArray = useFieldArray({ control: arraysForm.control, name: 'moves' });
  const backgroundArray = useFieldArray({ control: arraysForm.control, name: 'background' });
  const specialReqArray = useFieldArray({ control: arraysForm.control, name: 'specialReqs' });

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

  /* ----- auto-fill mutations ----- */
  // Surface the backend's real message (it throws BadRequestException with a
  // specific reason) instead of a generic "failed" toast.
  const serverError = (e: any, fallback: string): string => {
    const msg = e?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    return msg || e?.message || fallback;
  };

  // Persist the current location (address + Google coords) before an auto-fill
  // so it always runs against what's on screen — not a stale saved value.
  const persistLocationFirst = async () => {
    const v = headerForm.getValues();
    const lat = parseFloat(v.locationLat);
    const lng = parseFloat(v.locationLng);
    await callSheetsApi.update(id!, {
      locationName: v.locationName || undefined,
      locationAddress: v.locationAddress || undefined,
      locationLat: Number.isFinite(lat) ? lat : undefined,
      locationLng: Number.isFinite(lng) ? lng : undefined,
    });
  };

  const autoFillWeather = useMutation({
    mutationFn: async () => { await persistLocationFirst(); return callSheetsApi.autoFillWeather(id!); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.autoFillWeatherDone', 'Cuaca terisi otomatis.'));
    },
    onError: (e) => toast.error(serverError(e, t('callSheetEditor.autoFillWeatherFailed', 'Gagal mengisi cuaca otomatis.'))),
  });
  const autoFillSunTimes = useMutation({
    mutationFn: async () => { await persistLocationFirst(); return callSheetsApi.autoFillSunTimes(id!); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.autoFillSunDone', 'Jam matahari terisi otomatis.'));
    },
    onError: (e) => toast.error(serverError(e, t('callSheetEditor.autoFillSunFailed', 'Gagal mengisi jam matahari.'))),
  });
  const autoFillHospital = useMutation({
    mutationFn: async () => { await persistLocationFirst(); return callSheetsApi.autoFillHospital(id!); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.autoFillHospitalDone', 'Rumah sakit terisi otomatis.'));
    },
    onError: (e) => toast.error(serverError(e, t('callSheetEditor.autoFillHospitalFailed', 'Gagal mengisi rumah sakit.'))),
  });
  const autoFillAll = useMutation({
    mutationFn: async () => { await persistLocationFirst(); return callSheetsApi.autoFillAll(id!); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.autoFillAllDone', 'Data lokasi terisi otomatis.'));
    },
    onError: (e) => toast.error(serverError(e, t('callSheetEditor.autoFillAllFailed', 'Gagal mengisi data otomatis.'))),
  });
  const autoFillPending =
    autoFillWeather.isPending || autoFillSunTimes.isPending ||
    autoFillHospital.isPending || autoFillAll.isPending;

  /* ----- PHOTO: models ----- */
  const addModel = useMutation({
    mutationFn: (row: ModelRowForm) =>
      callSheetsApi.addModel(id!, {
        modelName: row.modelName,
        modelNumber: row.modelNumber || undefined,
        agencyName: row.agencyName || undefined,
        arrivalType: row.arrivalType,
        arrivalTime: row.arrivalTime || '8:00 AM',
        hmuStartTime: row.hmuStartTime || undefined,
        cameraReadyTime: row.cameraReadyTime || undefined,
        hmuArtist: row.hmuArtist || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.modelAdded', 'Model ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.modelAddFailed', 'Gagal menambah model.')),
  });
  const updateModel = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<ModelRowForm> }) =>
      callSheetsApi.updateModel(rowId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.modelUpdateFailed', 'Gagal memperbarui model.')),
  });
  const removeModel = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeModel(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.modelRemoved', 'Model dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.modelRemoveFailed', 'Gagal menghapus model.')),
  });

  /* ----- PHOTO: wardrobe ----- */
  const addWardrobe = useMutation({
    mutationFn: (row: WardrobeRowForm) =>
      callSheetsApi.addWardrobe(id!, {
        itemName: row.itemName,
        brand: row.brand || undefined,
        size: row.size || undefined,
        color: row.color || undefined,
        forModel: row.forModel || undefined,
        status: row.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.wardrobeAdded', 'Wardrobe ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.wardrobeAddFailed', 'Gagal menambah wardrobe.')),
  });
  const updateWardrobe = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<WardrobeRowForm> }) =>
      callSheetsApi.updateWardrobe(rowId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.wardrobeUpdateFailed', 'Gagal memperbarui wardrobe.')),
  });
  const removeWardrobe = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeWardrobe(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.wardrobeRemoved', 'Wardrobe dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.wardrobeRemoveFailed', 'Gagal menghapus wardrobe.')),
  });

  /* ----- PHOTO: HMU schedule ----- */
  const addHmu = useMutation({
    mutationFn: (row: HmuRowForm) =>
      callSheetsApi.addHmu(id!, {
        artistName: row.artistName,
        artistRole: row.artistRole,
        callTime: row.callTime || '7:00 AM',
        availableFrom: row.availableFrom || undefined,
        availableUntil: row.availableUntil || undefined,
        assignedModels: row.assignedModels || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.hmuAdded', 'Jadwal HMU ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.hmuAddFailed', 'Gagal menambah jadwal HMU.')),
  });
  const updateHmu = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<HmuRowForm> }) =>
      callSheetsApi.updateHmu(rowId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.hmuUpdateFailed', 'Gagal memperbarui jadwal HMU.')),
  });
  const removeHmu = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeHmu(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.hmuRemoved', 'Jadwal HMU dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.hmuRemoveFailed', 'Gagal menghapus jadwal HMU.')),
  });

  /* ----- FILM: meal breaks ----- */
  const addMeal = useMutation({
    mutationFn: (row: MealRowForm) =>
      callSheetsApi.addMeal(id!, {
        mealType: row.mealType,
        time: row.time || '12:00 PM',
        duration: row.duration ? parseInt(row.duration, 10) : undefined,
        location: row.location || undefined,
        notes: row.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.mealAdded', 'Jadwal makan ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.mealAddFailed', 'Gagal menambah jadwal makan.')),
  });
  const updateMeal = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<MealRowForm> }) =>
      callSheetsApi.updateMeal(rowId, {
        ...dto,
        duration: dto.duration != null ? (dto.duration ? parseInt(dto.duration, 10) : undefined) : undefined,
      } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.mealUpdateFailed', 'Gagal memperbarui jadwal makan.')),
  });
  const removeMeal = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeMeal(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.mealRemoved', 'Jadwal makan dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.mealRemoveFailed', 'Gagal menghapus jadwal makan.')),
  });

  /* ----- FILM: company moves ----- */
  const addMove = useMutation({
    mutationFn: (row: MoveRowForm) =>
      callSheetsApi.addMove(id!, {
        departTime: row.departTime || '12:00 PM',
        fromLocation: row.fromLocation,
        toLocation: row.toLocation,
        travelTime: row.travelTime ? parseInt(row.travelTime, 10) : undefined,
        notes: row.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.moveAdded', 'Perpindahan ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.moveAddFailed', 'Gagal menambah perpindahan.')),
  });
  const updateMove = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<MoveRowForm> }) =>
      callSheetsApi.updateMove(rowId, {
        ...dto,
        travelTime: dto.travelTime != null ? (dto.travelTime ? parseInt(dto.travelTime, 10) : undefined) : undefined,
      } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.moveUpdateFailed', 'Gagal memperbarui perpindahan.')),
  });
  const removeMove = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeMove(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.moveRemoved', 'Perpindahan dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.moveRemoveFailed', 'Gagal menghapus perpindahan.')),
  });

  /* ----- FILM: background / extras ----- */
  const addBackground = useMutation({
    mutationFn: (row: BackgroundRowForm) =>
      callSheetsApi.addBackground(id!, {
        description: row.description,
        quantity: row.quantity ? parseInt(row.quantity, 10) : undefined,
        callTime: row.callTime || '7:00 AM',
        reportLocation: row.reportLocation || undefined,
        scenes: row.scenes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.backgroundAdded', 'Figuran ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.backgroundAddFailed', 'Gagal menambah figuran.')),
  });
  const updateBackground = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<BackgroundRowForm> }) =>
      callSheetsApi.updateBackground(rowId, {
        ...dto,
        quantity: dto.quantity != null ? (dto.quantity ? parseInt(dto.quantity, 10) : undefined) : undefined,
      } as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.backgroundUpdateFailed', 'Gagal memperbarui figuran.')),
  });
  const removeBackground = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeBackground(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.backgroundRemoved', 'Figuran dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.backgroundRemoveFailed', 'Gagal menghapus figuran.')),
  });

  /* ----- FILM: special requirements ----- */
  const addSpecialReq = useMutation({
    mutationFn: (row: SpecialReqRowForm) =>
      callSheetsApi.addSpecialReq(id!, {
        reqType: row.reqType,
        description: row.description,
        contactName: row.contactName || undefined,
        contactPhone: row.contactPhone || undefined,
        safetyNotes: row.safetyNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.specialReqAdded', 'Kebutuhan khusus ditambahkan.'));
    },
    onError: () => toast.error(t('callSheetEditor.specialReqAddFailed', 'Gagal menambah kebutuhan khusus.')),
  });
  const updateSpecialReq = useMutation({
    mutationFn: ({ rowId, dto }: { rowId: string; dto: Partial<SpecialReqRowForm> }) =>
      callSheetsApi.updateSpecialReq(rowId, dto as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['call-sheet', id] }),
    onError: () => toast.error(t('callSheetEditor.specialReqUpdateFailed', 'Gagal memperbarui kebutuhan khusus.')),
  });
  const removeSpecialReq = useMutation({
    mutationFn: (rowId: string) => callSheetsApi.removeSpecialReq(rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      toast.success(t('callSheetEditor.specialReqRemoved', 'Kebutuhan khusus dihapus.'));
    },
    onError: () => toast.error(t('callSheetEditor.specialReqRemoveFailed', 'Gagal menghapus kebutuhan khusus.')),
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
    // Coordinates are decimals — parseInt would truncate lat/lng to whole
    // degrees (e.g. -6.21 → -6), pointing auto-fill at the wrong place.
    const toFloatOrUndef = (v: string) => {
      const n = parseFloat(v);
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
      locationLat: toFloatOrUndef(values.locationLat),
      locationLng: toFloatOrUndef(values.locationLng),
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
  //
  // Race-condition fix: rows newly created by an individual per-row save
  // only receive their server-assigned id after invalidateQueries → refetch
  // → the useEffect([callSheet]) reset runs. If Save All fires before that
  // settles, those rows still show id=undefined in form state and would be
  // duplicated. We prevent this by:
  //   (b) Writing each newly created row's id back into arraysForm
  //       immediately after the CREATE call so any subsequent iteration (or
  //       a rapid second Save All press) sees the id and PATCHes instead.
  //   (c) After all saves, awaiting invalidateQueries, then resetting
  //       arraysForm ourselves from the freshly-fetched callSheet data so
  //       the reactive useEffect([callSheet]) becomes a no-op and cannot
  //       clobber in-flight edits with stale server state.
  //   (a) The Save All button (and individual row Save buttons) are disabled
  //       while isSavingAll is true, preventing concurrent Save All runs.
  const [isSavingAll, setIsSavingAll] = useState(false);
  const handleSaveAll = async () => {
    if (!id) return;
    setIsSavingAll(true);
    try {
      await callSheetsApi.update(id, buildHeaderDto(headerForm.getValues()));

      const {
        crew, cast, activities,
        models, wardrobe, hmu,
        meals, moves, background, specialReqs,
      } = arraysForm.getValues();

      for (let i = 0; i < crew.length; i++) {
        const row = crew[i];
        if (!row.department || !row.position || !row.name) continue;
        const dto = {
          department: row.department,
          position: row.position,
          name: row.name,
          callTime: row.callTime || '7:00 AM',
          phone: row.phone || undefined,
          email: row.email || undefined,
        };
        if (row.id) {
          await callSheetsApi.updateCrew(row.id, dto as any);
        } else {
          // (b) write back the returned id so a second pass won't re-create
          const created: any = await callSheetsApi.addCrew(id, dto);
          if (created?.id) arraysForm.setValue(`crew.${i}.id`, created.id);
        }
      }

      for (let i = 0; i < cast.length; i++) {
        const row = cast[i];
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
          // (b) write back the returned id
          const created: any = await callSheetsApi.addCast(id, {
            actorName: row.actorName,
            character: row.character || undefined,
            callTime: row.callTime || '8:00 AM',
            castNumber: row.castNumber || undefined,
          });
          if (created?.id) arraysForm.setValue(`cast.${i}.id`, created.id);
        }
      }

      for (let i = 0; i < activities.length; i++) {
        const row = activities[i];
        if (!row.activityName) continue;
        const dto = {
          activityType: (row.activityType || 'GENERAL') as any,
          activityName: row.activityName,
          startTime: row.startTime || '8:00 AM',
          endTime: row.endTime || undefined,
          location: row.location || undefined,
          notes: row.notes || undefined,
        };
        if (row.id) {
          await callSheetsApi.updateActivity(row.id, dto as any);
        } else {
          // (b) write back the returned id
          const created: any = await callSheetsApi.addActivity(id, dto);
          if (created?.id) arraysForm.setValue(`activities.${i}.id`, created.id);
        }
      }

      // PHOTO: models
      for (let i = 0; i < models.length; i++) {
        const row = models[i];
        if (!row.modelName) continue;
        const dto = {
          modelName: row.modelName,
          modelNumber: row.modelNumber || undefined,
          agencyName: row.agencyName || undefined,
          arrivalType: row.arrivalType,
          arrivalTime: row.arrivalTime || '8:00 AM',
          hmuStartTime: row.hmuStartTime || undefined,
          cameraReadyTime: row.cameraReadyTime || undefined,
          hmuArtist: row.hmuArtist || undefined,
        };
        if (row.id) await callSheetsApi.updateModel(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addModel(id, dto);
          if (created?.id) arraysForm.setValue(`models.${i}.id`, created.id);
        }
      }

      // PHOTO: wardrobe
      for (let i = 0; i < wardrobe.length; i++) {
        const row = wardrobe[i];
        if (!row.itemName) continue;
        const dto = {
          itemName: row.itemName,
          brand: row.brand || undefined,
          size: row.size || undefined,
          color: row.color || undefined,
          forModel: row.forModel || undefined,
          status: row.status,
        };
        if (row.id) await callSheetsApi.updateWardrobe(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addWardrobe(id, dto);
          if (created?.id) arraysForm.setValue(`wardrobe.${i}.id`, created.id);
        }
      }

      // PHOTO: HMU schedule
      for (let i = 0; i < hmu.length; i++) {
        const row = hmu[i];
        if (!row.artistName) continue;
        const dto = {
          artistName: row.artistName,
          artistRole: row.artistRole,
          callTime: row.callTime || '7:00 AM',
          availableFrom: row.availableFrom || undefined,
          availableUntil: row.availableUntil || undefined,
          assignedModels: row.assignedModels || undefined,
        };
        if (row.id) await callSheetsApi.updateHmu(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addHmu(id, dto);
          if (created?.id) arraysForm.setValue(`hmu.${i}.id`, created.id);
        }
      }

      // FILM: meal breaks
      for (let i = 0; i < meals.length; i++) {
        const row = meals[i];
        if (!row.time) continue;
        const dto = {
          mealType: row.mealType,
          time: row.time,
          duration: row.duration ? parseInt(row.duration, 10) : undefined,
          location: row.location || undefined,
          notes: row.notes || undefined,
        };
        if (row.id) await callSheetsApi.updateMeal(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addMeal(id, dto);
          if (created?.id) arraysForm.setValue(`meals.${i}.id`, created.id);
        }
      }

      // FILM: company moves
      for (let i = 0; i < moves.length; i++) {
        const row = moves[i];
        if (!row.fromLocation || !row.toLocation) continue;
        const dto = {
          departTime: row.departTime || '12:00 PM',
          fromLocation: row.fromLocation,
          toLocation: row.toLocation,
          travelTime: row.travelTime ? parseInt(row.travelTime, 10) : undefined,
          notes: row.notes || undefined,
        };
        if (row.id) await callSheetsApi.updateMove(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addMove(id, dto);
          if (created?.id) arraysForm.setValue(`moves.${i}.id`, created.id);
        }
      }

      // FILM: background / extras
      for (let i = 0; i < background.length; i++) {
        const row = background[i];
        if (!row.description) continue;
        const dto = {
          description: row.description,
          quantity: row.quantity ? parseInt(row.quantity, 10) : undefined,
          callTime: row.callTime || '7:00 AM',
          reportLocation: row.reportLocation || undefined,
          scenes: row.scenes || undefined,
        };
        if (row.id) await callSheetsApi.updateBackground(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addBackground(id, dto);
          if (created?.id) arraysForm.setValue(`background.${i}.id`, created.id);
        }
      }

      // FILM: special requirements
      for (let i = 0; i < specialReqs.length; i++) {
        const row = specialReqs[i];
        if (!row.description) continue;
        const dto = {
          reqType: row.reqType,
          description: row.description,
          contactName: row.contactName || undefined,
          contactPhone: row.contactPhone || undefined,
          safetyNotes: row.safetyNotes || undefined,
        };
        if (row.id) await callSheetsApi.updateSpecialReq(row.id, dto as any);
        else {
          const created: any = await callSheetsApi.addSpecialReq(id, dto);
          if (created?.id) arraysForm.setValue(`specialReqs.${i}.id`, created.id);
        }
      }

      // (c) Await refetch before resetting forms. Reset arraysForm from the
      // fresh server data ourselves so the reactive useEffect([callSheet])
      // becomes a no-op (same values, no dirty diff) and cannot clobber
      // any still-in-progress edits the user started after clicking Save All.
      await queryClient.invalidateQueries({ queryKey: ['call-sheet', id] });
      const fresh = queryClient.getQueryData<CallSheet>(['call-sheet', id]);
      if (fresh) {
        arraysForm.reset(mapSheetToArrays(fresh));
      }
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
      topbar={{}}
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
            description={t('callSheetEditor.sectionLocationDesc', 'Address, parking, weather, and nearest hospital. Save a location to enable auto-fill.')}
            icon={<MapPin className="h-4 w-4" />}
          >
            <div className="space-y-5">
              {/* Auto-fill toolbar — only useful once a location is saved. */}
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-2.5">
                <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mr-1">
                  {t('callSheetEditor.autoFillLabel', 'Auto-fill')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasLocation || autoFillPending}
                  onClick={() => autoFillWeather.mutate()}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  {autoFillWeather.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CloudSun className="h-3.5 w-3.5" />}
                  {t('callSheetEditor.autoFillWeather', 'Weather')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasLocation || autoFillPending}
                  onClick={() => autoFillSunTimes.mutate()}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  {autoFillSunTimes.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sunrise className="h-3.5 w-3.5" />}
                  {t('callSheetEditor.autoFillSun', 'Sun Times')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasLocation || autoFillPending}
                  onClick={() => autoFillHospital.mutate()}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  {autoFillHospital.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <HeartPulse className="h-3.5 w-3.5" />}
                  {t('callSheetEditor.autoFillHospital', 'Hospital')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!hasLocation || autoFillPending}
                  onClick={() => autoFillAll.mutate()}
                >
                  {autoFillAll.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  {t('callSheetEditor.autoFillAll', 'Auto-fill All')}
                </Button>
                {!hasLocation && (
                  <span className="text-[11px] text-text-tertiary basis-full sm:basis-auto">
                    {t('callSheetEditor.autoFillNeedsLocation', 'Save a location first to enable auto-fill.')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label={t('callSheetEditor.fieldLocationName', 'Location Name')}>
                  <Input
                    {...headerForm.register('locationName')}
                    placeholder={t('callSheetEditor.locationNamePlaceholder', 'E.g. South Studio')}
                    className="bg-bg-sunken border-border-default"
                  />
                </Field>
                <Field label={t('callSheetEditor.fieldAddress', 'Address')}>
                  <AddressAutocomplete
                    value={headerForm.watch('locationAddress')}
                    onChange={(v) => {
                      headerForm.setValue('locationAddress', v, { shouldDirty: true });
                      // Free typing invalidates any previously captured coords.
                      headerForm.setValue('locationLat', '', { shouldDirty: true });
                      headerForm.setValue('locationLng', '', { shouldDirty: true });
                    }}
                    onSelect={(v, coords) => {
                      headerForm.setValue('locationAddress', v, { shouldDirty: true });
                      // Seed the location name from the address if it's still empty.
                      if (!headerForm.getValues('locationName')) {
                        headerForm.setValue('locationName', v.split(',')[0]?.trim() ?? '', { shouldDirty: true });
                      }
                      // Store precise Google coordinates for reliable auto-fill.
                      headerForm.setValue('locationLat', coords ? String(coords.lat) : '', { shouldDirty: true });
                      headerForm.setValue('locationLng', coords ? String(coords.lng) : '', { shouldDirty: true });
                    }}
                    placeholder={t('callSheetEditor.addressPlaceholder', 'Jl. Sudirman No. 123, Jakarta')}
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
                          disabled={isSavingAll}
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
                          disabled={isSavingAll}
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
                          disabled={isSavingAll}
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

          {/* ============================================================ */}
          {/* PHOTO-only sections — Models, Wardrobe, HMU schedule        */}
          {/* ============================================================ */}
          {callSheet.callSheetType === 'PHOTO' && (
            <>
              {/* ──── Models / Talent arrivals ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowModels', 'Photo Talent')}
                title={t('callSheetEditor.sectionModels', 'Models')}
                description={t('callSheetEditor.sectionModelsDesc', 'Model arrival flow: arrival type, HMU start, and camera-ready time.')}
                icon={<Users className="h-4 w-4" />}
              >
                {modelArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noModels', 'No models yet. Click "Add Model" to get started.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[1fr_120px_120px_100px_110px_1fr_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colName', 'Name')}</div>
                      <div>{t('callSheetEditor.colAgency', 'Agency')}</div>
                      <div>{t('callSheetEditor.colArrivalType', 'Arrival')}</div>
                      <div>{t('callSheetEditor.colArrivalTime', 'Arrive')}</div>
                      <div>{t('callSheetEditor.colCameraReady', 'Cam Ready')}</div>
                      <div>{t('callSheetEditor.colHmuArtist', 'HMU Artist')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {modelArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`models.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_100px_110px_1fr_32px] gap-2 py-2 items-center"
                          >
                            <Input
                              {...arraysForm.register(`models.${idx}.modelName`)}
                              placeholder={t('callSheetEditor.modelNamePlaceholder', 'Model name')}
                              onBlur={(e) => { if (row?.id) updateModel.mutate({ rowId: row.id, dto: { modelName: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`models.${idx}.agencyName`)}
                              placeholder={t('callSheetEditor.agencyPlaceholder', 'Agency')}
                              onBlur={(e) => { if (row?.id) updateModel.mutate({ rowId: row.id, dto: { agencyName: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Controller
                              control={arraysForm.control}
                              name={`models.${idx}.arrivalType`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    if (row?.id) updateModel.mutate({ rowId: row.id, dto: { arrivalType: v as ModelArrivalType } });
                                  }}
                                >
                                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MODEL_ARRIVAL_TYPES.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey, o.labelFallback)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Input
                              {...arraysForm.register(`models.${idx}.arrivalTime`)}
                              placeholder="8:00 AM"
                              onBlur={(e) => { if (row?.id) updateModel.mutate({ rowId: row.id, dto: { arrivalTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`models.${idx}.cameraReadyTime`)}
                              placeholder="9:30 AM"
                              onBlur={(e) => { if (row?.id) updateModel.mutate({ rowId: row.id, dto: { cameraReadyTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`models.${idx}.hmuArtist`)}
                              placeholder={t('callSheetEditor.hmuArtistPlaceholder', 'HMU artist')}
                              onBlur={(e) => { if (row?.id) updateModel.mutate({ rowId: row.id, dto: { hmuArtist: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.modelName) { toast.error(t('callSheetEditor.modelNameRequired', 'Model name is required.')); return; }
                                addModel.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeModel.mutate(row.id); else modelArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => modelArray.append({
                    modelName: '', modelNumber: '', agencyName: '',
                    arrivalType: 'CAMERA_READY', arrivalTime: '',
                    hmuStartTime: '', cameraReadyTime: '', hmuArtist: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addModel', 'Add Model')}
                </Button>
              </FormSection>

              {/* ──── Wardrobe ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowStyling', 'Styling')}
                title={t('callSheetEditor.sectionWardrobe', 'Wardrobe')}
                description={t('callSheetEditor.sectionWardrobeDesc', 'Wardrobe items, sizing, and tracking status per look.')}
                icon={<Shirt className="h-4 w-4" />}
              >
                {wardrobeArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noWardrobe', 'No wardrobe items yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_120px_130px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colItem', 'Item')}</div>
                      <div>{t('callSheetEditor.colBrand', 'Brand')}</div>
                      <div>{t('callSheetEditor.colSize', 'Size')}</div>
                      <div>{t('callSheetEditor.colColor', 'Color')}</div>
                      <div>{t('callSheetEditor.colForModel', 'For Model')}</div>
                      <div>{t('callSheetEditor.colStatus', 'Status')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {wardrobeArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`wardrobe.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_120px_80px_100px_120px_130px_32px] gap-2 py-2 items-center"
                          >
                            <Input
                              {...arraysForm.register(`wardrobe.${idx}.itemName`)}
                              placeholder={t('callSheetEditor.itemPlaceholder', 'Item name')}
                              onBlur={(e) => { if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { itemName: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`wardrobe.${idx}.brand`)}
                              placeholder={t('callSheetEditor.brandPlaceholder', 'Brand')}
                              onBlur={(e) => { if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { brand: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`wardrobe.${idx}.size`)}
                              placeholder="M"
                              onBlur={(e) => { if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { size: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm text-center"
                            />
                            <Input
                              {...arraysForm.register(`wardrobe.${idx}.color`)}
                              placeholder={t('callSheetEditor.colorPlaceholder', 'Color')}
                              onBlur={(e) => { if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { color: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`wardrobe.${idx}.forModel`)}
                              placeholder={t('callSheetEditor.forModelPlaceholder', 'Model')}
                              onBlur={(e) => { if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { forModel: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Controller
                              control={arraysForm.control}
                              name={`wardrobe.${idx}.status`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    if (row?.id) updateWardrobe.mutate({ rowId: row.id, dto: { status: v as WardrobeStatus } });
                                  }}
                                >
                                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {WARDROBE_STATUSES.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey, o.labelFallback)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.itemName) { toast.error(t('callSheetEditor.itemNameRequired', 'Item name is required.')); return; }
                                addWardrobe.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeWardrobe.mutate(row.id); else wardrobeArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => wardrobeArray.append({
                    itemName: '', brand: '', size: '', color: '',
                    forModel: '', status: 'PENDING',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addWardrobe', 'Add Wardrobe')}
                </Button>
              </FormSection>

              {/* ──── HMU schedule ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowHmu', 'Hair & Makeup')}
                title={t('callSheetEditor.sectionHmu', 'HMU Schedule')}
                description={t('callSheetEditor.sectionHmuDesc', 'Hair & makeup artist call times and availability.')}
                icon={<Sparkles className="h-4 w-4" />}
              >
                {hmuArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noHmu', 'No HMU schedule yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[1fr_130px_100px_100px_100px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colArtist', 'Artist')}</div>
                      <div>{t('callSheetEditor.colRole', 'Role')}</div>
                      <div>{t('callSheetEditor.colCall', 'Call')}</div>
                      <div>{t('callSheetEditor.colFrom', 'From')}</div>
                      <div>{t('callSheetEditor.colUntil', 'Until')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {hmuArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`hmu.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_130px_100px_100px_100px_32px] gap-2 py-2 items-center"
                          >
                            <Input
                              {...arraysForm.register(`hmu.${idx}.artistName`)}
                              placeholder={t('callSheetEditor.artistPlaceholder', 'Artist name')}
                              onBlur={(e) => { if (row?.id) updateHmu.mutate({ rowId: row.id, dto: { artistName: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Controller
                              control={arraysForm.control}
                              name={`hmu.${idx}.artistRole`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    if (row?.id) updateHmu.mutate({ rowId: row.id, dto: { artistRole: v as HMURole } });
                                  }}
                                >
                                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {HMU_ROLES.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey, o.labelFallback)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Input
                              {...arraysForm.register(`hmu.${idx}.callTime`)}
                              placeholder="7:00 AM"
                              onBlur={(e) => { if (row?.id) updateHmu.mutate({ rowId: row.id, dto: { callTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`hmu.${idx}.availableFrom`)}
                              placeholder="7:00 AM"
                              onBlur={(e) => { if (row?.id) updateHmu.mutate({ rowId: row.id, dto: { availableFrom: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`hmu.${idx}.availableUntil`)}
                              placeholder="4:00 PM"
                              onBlur={(e) => { if (row?.id) updateHmu.mutate({ rowId: row.id, dto: { availableUntil: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.artistName) { toast.error(t('callSheetEditor.artistNameRequired', 'Artist name is required.')); return; }
                                addHmu.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeHmu.mutate(row.id); else hmuArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => hmuArray.append({
                    artistName: '', artistRole: 'BOTH', callTime: '',
                    availableFrom: '', availableUntil: '', assignedModels: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addHmu', 'Add HMU Artist')}
                </Button>
              </FormSection>
            </>
          )}

          {/* ============================================================ */}
          {/* FILM-only sections — Meals, Moves, Background, Special Reqs */}
          {/* ============================================================ */}
          {callSheet.callSheetType === 'FILM' && (
            <>
              {/* ──── Meal breaks ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowCatering', 'Catering')}
                title={t('callSheetEditor.sectionMeals', 'Meal Breaks')}
                description={t('callSheetEditor.sectionMealsDesc', 'Scheduled meals with time, duration, and location.')}
                icon={<Utensils className="h-4 w-4" />}
              >
                {mealArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noMeals', 'No meal breaks yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[150px_100px_90px_1fr_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colMealType', 'Type')}</div>
                      <div>{t('callSheetEditor.colTime', 'Time')}</div>
                      <div>{t('callSheetEditor.colDuration', 'Min')}</div>
                      <div>{t('callSheetEditor.colLocation', 'Location')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {mealArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`meals.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[150px_100px_90px_1fr_32px] gap-2 py-2 items-center"
                          >
                            <Controller
                              control={arraysForm.control}
                              name={`meals.${idx}.mealType`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    if (row?.id) updateMeal.mutate({ rowId: row.id, dto: { mealType: v as MealType } });
                                  }}
                                >
                                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MEAL_TYPES.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey, o.labelFallback)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Input
                              {...arraysForm.register(`meals.${idx}.time`)}
                              placeholder="12:00 PM"
                              onBlur={(e) => { if (row?.id) updateMeal.mutate({ rowId: row.id, dto: { time: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              type="number"
                              {...arraysForm.register(`meals.${idx}.duration`)}
                              placeholder="30"
                              onBlur={(e) => { if (row?.id) updateMeal.mutate({ rowId: row.id, dto: { duration: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`meals.${idx}.location`)}
                              placeholder={t('callSheetEditor.locationOptionalPlaceholder', 'Location (optional)')}
                              onBlur={(e) => { if (row?.id) updateMeal.mutate({ rowId: row.id, dto: { location: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.time) { toast.error(t('callSheetEditor.mealTimeRequired', 'Meal time is required.')); return; }
                                addMeal.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeMeal.mutate(row.id); else mealArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => mealArray.append({
                    mealType: 'LUNCH', time: '', duration: '', location: '', notes: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addMeal', 'Add Meal Break')}
                </Button>
              </FormSection>

              {/* ──── Company moves ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowLogistics', 'Logistics')}
                title={t('callSheetEditor.sectionMoves', 'Company Moves')}
                description={t('callSheetEditor.sectionMovesDesc', 'Mid-day location moves with depart time and travel estimate.')}
                icon={<Truck className="h-4 w-4" />}
              >
                {moveArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noMoves', 'No company moves yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[100px_1fr_1fr_90px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colDepart', 'Depart')}</div>
                      <div>{t('callSheetEditor.colFromLoc', 'From')}</div>
                      <div>{t('callSheetEditor.colToLoc', 'To')}</div>
                      <div>{t('callSheetEditor.colTravel', 'Travel')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {moveArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`moves.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[100px_1fr_1fr_90px_32px] gap-2 py-2 items-center"
                          >
                            <Input
                              {...arraysForm.register(`moves.${idx}.departTime`)}
                              placeholder="1:00 PM"
                              onBlur={(e) => { if (row?.id) updateMove.mutate({ rowId: row.id, dto: { departTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`moves.${idx}.fromLocation`)}
                              placeholder={t('callSheetEditor.fromLocPlaceholder', 'From location')}
                              onBlur={(e) => { if (row?.id) updateMove.mutate({ rowId: row.id, dto: { fromLocation: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`moves.${idx}.toLocation`)}
                              placeholder={t('callSheetEditor.toLocPlaceholder', 'To location')}
                              onBlur={(e) => { if (row?.id) updateMove.mutate({ rowId: row.id, dto: { toLocation: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              type="number"
                              {...arraysForm.register(`moves.${idx}.travelTime`)}
                              placeholder="30"
                              onBlur={(e) => { if (row?.id) updateMove.mutate({ rowId: row.id, dto: { travelTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.fromLocation || !row.toLocation) { toast.error(t('callSheetEditor.moveLocRequired', 'From and to locations are required.')); return; }
                                addMove.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeMove.mutate(row.id); else moveArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => moveArray.append({
                    departTime: '', fromLocation: '', toLocation: '', travelTime: '', notes: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addMove', 'Add Company Move')}
                </Button>
              </FormSection>

              {/* ──── Background / Extras ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowExtras', 'Extras')}
                title={t('callSheetEditor.sectionBackground', 'Background / Extras')}
                description={t('callSheetEditor.sectionBackgroundDesc', 'Background talent groups with quantity and call time.')}
                icon={<UsersRound className="h-4 w-4" />}
              >
                {backgroundArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noBackground', 'No background talent yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[1fr_80px_100px_1fr_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colDescription', 'Description')}</div>
                      <div>{t('callSheetEditor.colQuantity', 'Qty')}</div>
                      <div>{t('callSheetEditor.colCall', 'Call')}</div>
                      <div>{t('callSheetEditor.colReportLoc', 'Report To')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {backgroundArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`background.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_1fr_32px] gap-2 py-2 items-center"
                          >
                            <Input
                              {...arraysForm.register(`background.${idx}.description`)}
                              placeholder={t('callSheetEditor.bgDescPlaceholder', 'E.g. Pedestrians')}
                              onBlur={(e) => { if (row?.id) updateBackground.mutate({ rowId: row.id, dto: { description: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              type="number"
                              {...arraysForm.register(`background.${idx}.quantity`)}
                              placeholder="10"
                              onBlur={(e) => { if (row?.id) updateBackground.mutate({ rowId: row.id, dto: { quantity: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`background.${idx}.callTime`)}
                              placeholder="7:00 AM"
                              onBlur={(e) => { if (row?.id) updateBackground.mutate({ rowId: row.id, dto: { callTime: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <Input
                              {...arraysForm.register(`background.${idx}.reportLocation`)}
                              placeholder={t('callSheetEditor.reportLocPlaceholder', 'Report location')}
                              onBlur={(e) => { if (row?.id) updateBackground.mutate({ rowId: row.id, dto: { reportLocation: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.description) { toast.error(t('callSheetEditor.bgDescRequired', 'Description is required.')); return; }
                                addBackground.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeBackground.mutate(row.id); else backgroundArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => backgroundArray.append({
                    description: '', quantity: '', callTime: '', reportLocation: '', scenes: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addBackground', 'Add Background')}
                </Button>
              </FormSection>

              {/* ──── Special requirements ──── */}
              <FormSection
                eyebrow={t('callSheetEditor.eyebrowSafety', 'Safety')}
                title={t('callSheetEditor.sectionSpecialReqs', 'Special Requirements')}
                description={t('callSheetEditor.sectionSpecialReqsDesc', 'Stunts, minors, animals, SFX and other safety-flagged needs.')}
                icon={<ShieldAlert className="h-4 w-4" />}
              >
                {specialReqArray.fields.length === 0 ? (
                  <p className="text-sm text-text-tertiary italic mb-4">
                    {t('callSheetEditor.noSpecialReqs', 'No special requirements yet.')}
                  </p>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="hidden sm:grid grid-cols-[140px_1fr_130px_120px_32px] gap-2 px-1 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                      <div>{t('callSheetEditor.colReqType', 'Type')}</div>
                      <div>{t('callSheetEditor.colDescription', 'Description')}</div>
                      <div>{t('callSheetEditor.colContact', 'Contact')}</div>
                      <div>{t('callSheetEditor.colPhone', 'Phone')}</div>
                      <div />
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {specialReqArray.fields.map((field, idx) => {
                        const row = arraysForm.watch(`specialReqs.${idx}`);
                        return (
                          <div
                            key={field.id}
                            className="grid grid-cols-1 sm:grid-cols-[140px_1fr_130px_120px_32px] gap-2 py-2 items-center"
                          >
                            <Controller
                              control={arraysForm.control}
                              name={`specialReqs.${idx}.reqType`}
                              render={({ field: f }) => (
                                <Select
                                  value={f.value}
                                  onValueChange={(v) => {
                                    f.onChange(v);
                                    if (row?.id) updateSpecialReq.mutate({ rowId: row.id, dto: { reqType: v as SpecialReqType } });
                                  }}
                                >
                                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SPECIAL_REQ_TYPES.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey, o.labelFallback)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            <Input
                              {...arraysForm.register(`specialReqs.${idx}.description`)}
                              placeholder={t('callSheetEditor.reqDescPlaceholder', 'Describe the requirement')}
                              onBlur={(e) => { if (row?.id) updateSpecialReq.mutate({ rowId: row.id, dto: { description: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`specialReqs.${idx}.contactName`)}
                              placeholder={t('callSheetEditor.contactNamePlaceholder', 'Contact')}
                              onBlur={(e) => { if (row?.id) updateSpecialReq.mutate({ rowId: row.id, dto: { contactName: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm"
                            />
                            <Input
                              {...arraysForm.register(`specialReqs.${idx}.contactPhone`)}
                              placeholder="0812-..."
                              onBlur={(e) => { if (row?.id) updateSpecialReq.mutate({ rowId: row.id, dto: { contactPhone: e.target.value } }); }}
                              className="bg-bg-sunken border-border-subtle text-sm tabular-nums"
                            />
                            <RowActions
                              isSaved={!!row?.id}
                              disabled={isSavingAll}
                              onSave={() => {
                                if (!row.description) { toast.error(t('callSheetEditor.reqDescRequired', 'Description is required.')); return; }
                                addSpecialReq.mutate(row);
                              }}
                              onRemove={() => { if (row?.id) removeSpecialReq.mutate(row.id); else specialReqArray.remove(idx); }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => specialReqArray.append({
                    reqType: 'STUNTS', description: '', contactName: '', contactPhone: '', safetyNotes: '',
                  })}
                  className="border-border-subtle text-text-secondary hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('callSheetEditor.addSpecialReq', 'Add Requirement')}
                </Button>
              </FormSection>
            </>
          )}

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

/* Address field with type-ahead suggestions (restores the v1 Google
   Places lookup). Primary path: Google Places Autocomplete — picking a
   suggestion fetches precise lat/lng (stored on the call sheet so
   weather / sun-times / hospital auto-fill are reliable). Fallback when
   no VITE_GOOGLE_MAPS_API_KEY / Google fails to load: the OSM/Nominatim
   address search (GET /call-sheets/search/addresses); the backend then
   geocodes the chosen address server-side. */
type AddressSuggestion = { placeId: string; main: string; secondary: string; description: string; lat?: number; lng?: number };

function AddressAutocomplete({
  value, onChange, onSelect, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: string, coords?: { lat: number; lng: number }) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const { loaded, error } = useGoogleMapsLoader();
  const googleReady = loaded && !error && !!window.google?.maps?.places;

  const [query, setQuery] = useState(value ?? '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<any>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the local field in sync when the form value changes externally
  // (initial load, form reset after save / auto-fill).
  useEffect(() => { setQuery(value ?? ''); }, [value]);

  // Fresh Places session token (groups autocomplete + details billing).
  useEffect(() => {
    if (googleReady && window.google.maps.places.AutocompleteSessionToken) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [googleReady]);

  // Close the suggestion list on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchGoogle = (q: string) => {
    const svc = new window.google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input: q, componentRestrictions: { country: 'id' }, sessionToken: sessionTokenRef.current },
      (predictions: any, status: any) => {
        setLoading(false);
        if (status !== 'OK' || !predictions) { setSuggestions([]); setOpen(false); return; }
        setSuggestions(predictions.map((p: any) => ({
          placeId: p.place_id || '',
          main: p.structured_formatting?.main_text || p.description || '',
          secondary: p.structured_formatting?.secondary_text || '',
          description: p.description || '',
        })));
        setOpen(true);
      },
    );
  };

  const searchNominatim = async (q: string) => {
    try {
      const res = await callSheetsApi.searchAddresses(q);
      setSuggestions(res.map((r) => ({ placeId: '', main: r.label, secondary: '', description: r.value, lat: r.lat, lng: r.lng })));
      setOpen(res.length > 0);
    } catch {
      setSuggestions([]); setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      if (googleReady) searchGoogle(q.trim());
      else searchNominatim(q.trim());
    }, 300);
  };

  const pick = (s: AddressSuggestion) => {
    setQuery(s.description);
    setSuggestions([]);
    setOpen(false);

    if (googleReady && s.placeId) {
      const places = new window.google.maps.places.PlacesService(document.createElement('div'));
      places.getDetails(
        { placeId: s.placeId, fields: ['geometry', 'formatted_address'], sessionToken: sessionTokenRef.current },
        (place: any, status: any) => {
          if (status === 'OK' && place?.geometry?.location) {
            onSelect(s.description, {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          } else {
            onSelect(s.description);
          }
          // Consume the session token; start a new one for the next search.
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        },
      );
    } else {
      // Nominatim fallback: the suggestion already carries lat/lng, so we still
      // store coordinates (no second geocode needed during auto-fill).
      onSelect(
        s.description,
        s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : undefined,
      );
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Input
          value={query}
          autoComplete="off"
          placeholder={placeholder}
          className="bg-bg-sunken border-border-default pr-8"
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); runSearch(e.target.value); }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        />
        {loading
          ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-tertiary" />
          : <MapPin className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border-default bg-bg-raised shadow-lg py-1">
          {suggestions.map((s, i) => (
            <li key={`${s.placeId || s.description}-${i}`}>
              <button
                type="button"
                className="block w-full text-left px-3 py-2 hover:bg-bg-sunken leading-snug"
                onClick={() => pick(s)}
              >
                <div className="text-xs font-medium text-text-primary truncate">{s.main}</div>
                {s.secondary && <div className="text-[11px] text-text-tertiary truncate">{s.secondary}</div>}
              </button>
            </li>
          ))}
          {googleReady && (
            <li className="px-3 py-1.5 text-right text-[10px] text-text-tertiary border-t border-border-subtle">
              {t('callSheetEditor.poweredByGoogle', 'Powered by Google')}
            </li>
          )}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-text-tertiary">
        {t('callSheetEditor.addressAutocompleteHint', 'Pick a suggestion so weather & sun-times auto-fill can locate the shoot.')}
      </p>
    </div>
  );
}

/* Row actions — unsaved rows show a quiet "Unsaved" badge (Save All
   commits them). The per-row Save icon has been removed because it
   implied rows weren't auto-saved on blur, creating a data-loss
   footgun. Per-field onBlur handlers still fire PATCH requests for
   existing (saved) rows; new rows are committed on "Save All".
   disabled=true while a Save All is in progress (prevents races). */
const RowActions = ({
  isSaved, onSave: _onSave, onRemove, disabled,
}: { isSaved: boolean; onSave: () => void; onRemove: () => void; disabled?: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-1.5">
      {!isSaved && (
        <span
          title={t('callSheetEditor.unsavedRowHint', 'This row is new — click "Save Call Sheet" to persist it.')}
          className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] bg-warning/10 text-warning border border-warning/20 cursor-default select-none"
        >
          {t('callSheetEditor.unsaved', 'New')}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={disabled}
        className="text-text-tertiary hover:text-danger"
        aria-label={t('callSheetEditor.removeRow', 'Remove row')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
