import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Plus, Save, Trash2, ChevronUp, ChevronDown, Loader2, Image as ImageIcon,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuthStore } from '@/store/auth';
import { decksApi, slidesApi } from '@/services/decks';
import { projectService } from '@/services/projects';
import type { DeckStatus, SlideTemplate } from '@/types/deck';

/* ------------------------------------------------------------------ */
/*  Nav — consistent with the rest of v2                               */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Schema — v2 keeps slide editing structured (heading / body /       */
/*  image / layout / notes). Free-form canvas authoring is deferred to */
/*  the classic editor.                                                */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { value: DeckStatus; label: string }[] = [
  { value: 'DRAFT',     label: 'Draf' },
  { value: 'PUBLISHED', label: 'Diterbitkan' },
  { value: 'ARCHIVED',  label: 'Diarsipkan' },
];

const LAYOUT_OPTIONS: { value: SlideTemplate; label: string }[] = [
  { value: 'TITLE',          label: 'Judul' },
  { value: 'TITLE_CONTENT',  label: 'Judul + Isi' },
  { value: 'TWO_COLUMN',     label: 'Dua Kolom' },
  { value: 'FULL_MEDIA',     label: 'Gambar Penuh' },
  { value: 'MOOD_BOARD',     label: 'Moodboard' },
  { value: 'BLANK',          label: 'Kosong' },
];

const slideSchema = z.object({
  id:              z.string().optional(),           // existing slide → string id; new slide → undefined
  template:        z.string().min(1),
  title:           z.string().optional(),
  subtitle:        z.string().optional(),
  backgroundImage: z.string().optional(),
  notes:           z.string().optional(),
});

const formSchema = z.object({
  title:       z.string().min(2, 'Judul deck minimal 2 karakter'),
  description: z.string().optional(),
  status:      z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  projectId:   z.string().optional(),
  slides:      z.array(slideSchema),
});
type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DeckEditorPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: deck, isLoading, error, refetch } = useQuery({
    queryKey: ['deck', id],
    queryFn:  () => decksApi.getById(id!),
    enabled:  !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });

  /* ---------- defaults derived from server data ---------- */
  const defaultValues = useMemo<FormValues>(() => {
    if (!deck) {
      return { title: '', description: '', status: 'DRAFT', projectId: '', slides: [] };
    }
    return {
      title:       deck.title,
      description: deck.description ?? '',
      status:      deck.status,
      projectId:   deck.projectId ?? '',
      slides: [...(deck.slides ?? [])]
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id:              s.id,
          template:        s.template,
          title:           s.title ?? '',
          subtitle:        s.subtitle ?? '',
          backgroundImage: s.backgroundImage ?? '',
          notes:           s.notes ?? '',
        })),
    };
  }, [deck]);

  const {
    register, handleSubmit, control, reset, formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove, move } = useFieldArray({ control, name: 'slides' });

  /* ---------- save: diff against the original slide set ---------- */
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!id || !deck) return;

      // 1. deck-level update
      await decksApi.update(id, {
        title:       values.title,
        description: values.description || undefined,
        status:      values.status,
        projectId:   values.projectId || undefined,
      });

      // 2. slide diff
      const originalIds = new Set((deck.slides ?? []).map((s) => s.id));
      const keptIds     = new Set(values.slides.map((s) => s.id).filter(Boolean) as string[]);

      // deletes — anything in original but no longer present
      const toDelete = [...originalIds].filter((sid) => !keptIds.has(sid));
      for (const sid of toDelete) {
        await slidesApi.delete(sid);
      }

      // upserts — index drives order
      for (let i = 0; i < values.slides.length; i++) {
        const s = values.slides[i];
        const payload = {
          template:        s.template as SlideTemplate,
          title:           s.title || undefined,
          subtitle:        s.subtitle || undefined,
          backgroundImage: s.backgroundImage || undefined,
          notes:           s.notes || undefined,
          order:           i,
        };
        if (s.id && originalIds.has(s.id)) {
          await slidesApi.update(s.id, payload);
        } else {
          await slidesApi.create({ deckId: id, ...payload });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success('Perubahan deck disimpan');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan deck');
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => saveMutation.mutateAsync(values);

  /* ---------- loading / error guards ---------- */
  if (isLoading) {
    return (
      <Shell user={user}>
        <PageContainer>
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Skeleton className="h-40 rounded-lg mb-4" />
          <Skeleton className="h-64 rounded-lg" />
        </PageContainer>
      </Shell>
    );
  }

  if (error || !deck) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Deck tidak ditemukan"
            description={
              error instanceof Error
                ? error.message
                : 'Deck ini mungkin sudah dihapus atau Anda tidak memiliki akses.'
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/v2/decks')}>
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Deck
                </Button>
                <Button size="sm" onClick={() => refetch()}>Coba Lagi</Button>
              </div>
            }
          />
        </PageContainer>
      </Shell>
    );
  }

  const isPending = isSubmitting || saveMutation.isPending;

  /* ---------- render ---------- */
  return (
    <Shell user={user}>
      <PageContainer>
        <div className="mb-4">
          <Link
            to="/v2/decks"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Deck
          </Link>
        </div>

        <PageHeader
          title="Editor Deck"
          description="Susun slide presentasi: judul, isi, gambar, dan layout. Penyusunan ulang via tombol atas/bawah."
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ─────────────────────────────────────────────────────────
              Identity card — deck meta. Single panel so the page
              opens with a clear "this is the deck" reading.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow="Identitas"
            title="Detail Deck"
            description="Judul tampil di daftar deck. Status mengatur visibilitas dan tanda PUBLISHED."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>Judul Deck</FieldLabel>
                <Input
                  placeholder="Misal: Pitch Q1 2026"
                  {...register('title')}
                  className="bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.title}
                />
                <FieldError message={errors.title?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>Deskripsi</FieldLabel>
                <textarea
                  rows={3}
                  placeholder="Konteks ringkas tentang deck ini (opsional)"
                  {...register('description')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Status</FieldLabel>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Proyek</FieldLabel>
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select
                      value={field.value || '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                    >
                      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
                        <SelectValue placeholder="Tidak terhubung" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="__none__">Tidak terhubung</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-text-tertiary mr-2">
                              {p.number || '—'}
                            </span>
                            {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Slide stack — vertical list. Each slide is its own card
              with index pill, layout select, heading/body/image/notes,
              and reorder/delete chrome on the right rail.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow="Slide"
            title={`Slide (${fields.length})`}
            description="Susun konten tiap slide. Layout adalah pola tata letak referensi — dapat diubah sewaktu-waktu."
          >
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle bg-bg-sunken/40 py-10 text-center">
                <p className="text-sm text-text-tertiary">
                  Deck ini belum punya slide. Tambahkan slide pertama untuk mulai.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <SlideRow
                    key={field.id}
                    index={idx}
                    total={fields.length}
                    register={register}
                    control={control}
                    onMoveUp={() => idx > 0 && move(idx, idx - 1)}
                    onMoveDown={() => idx < fields.length - 1 && move(idx, idx + 1)}
                    onRemove={() => remove(idx)}
                  />
                ))}
              </div>
            )}

            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id:              undefined,
                    template:        'TITLE_CONTENT',
                    title:           '',
                    subtitle:        '',
                    backgroundImage: '',
                    notes:           '',
                  })
                }
                className="border-border-subtle text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Slide
              </Button>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Sticky action bar — same shape as InvoiceForm. Save commits
              both deck meta and slide diff in one server pass.
             ───────────────────────────────────────────────────────── */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-text-tertiary">
                {isDirty
                  ? 'Ada perubahan yang belum disimpan.'
                  : 'Tidak ada perubahan tertunda.'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/v2/decks')}
                  disabled={isPending}
                  className="text-text-secondary hover:text-text-primary"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium min-w-[120px]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Deferred-from-v1 callout — keeps the visual editor expectations
            honest. Authors who need canvas authoring still get the classic
            page until v2 grows that surface. */}
        <p className="mt-6 text-[11px] text-text-tertiary leading-relaxed">
          Catatan v2: editor kanvas bebas (drag elemen, teks kaya, presentasi
          live, kolaborasi real-time, ekspor PDF/PNG, dan upload aset) masih
          tersedia di tampilan klasik. Tampilan v2 fokus pada CRUD slide
          terstruktur.
        </p>
      </PageContainer>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell helper — same pattern as DecksPage                           */
/* ------------------------------------------------------------------ */

function Shell({
  user, children,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      {children}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  SlideRow — one slide card. Right rail holds index + reorder +      */
/*  delete; left column carries the editable fields. Layout type and   */
/*  image url stay in a row of secondary fields below the heading so   */
/*  the reading order matches a slide preview.                         */
/* ------------------------------------------------------------------ */

function SlideRow({
  index, total, register, control, onMoveUp, onMoveDown, onRemove,
}: {
  index: number;
  total: number;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  control: ReturnType<typeof useForm<FormValues>>['control'];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-sunken/40 p-4">
      <div className="grid grid-cols-[40px_1fr_56px] gap-4 items-start">
        {/* index pill */}
        <div className="text-center pt-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
            Slide
          </div>
          <div className="mt-1 font-display font-semibold text-text-primary tabular-nums text-lg leading-none">
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        {/* fields */}
        <div className="space-y-3 min-w-0">
          <Input
            placeholder="Judul slide (heading)"
            {...register(`slides.${index}.title` as const)}
            className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-sm"
          />
          <textarea
            rows={3}
            placeholder="Isi / body slide"
            {...register(`slides.${index}.subtitle` as const)}
            className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/80 px-3 py-2 text-sm text-text-secondary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
          />

          <Separator className="bg-border-subtle" />

          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                Layout
              </Label>
              <Controller
                control={control}
                name={`slides.${index}.template` as const}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger size="sm" className="w-full bg-bg-sunken border-border-subtle text-text-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAYOUT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
                URL Gambar Latar
              </Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                <Input
                  placeholder="https://… (opsional)"
                  {...register(`slides.${index}.backgroundImage` as const)}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-secondary placeholder:text-text-tertiary text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-[0.12em] font-medium text-text-tertiary">
              Catatan Pembicara
            </Label>
            <textarea
              rows={2}
              placeholder="Catatan untuk pembicara (opsional)"
              {...register(`slides.${index}.notes` as const)}
              className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-1.5 text-xs text-text-tertiary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </div>
        </div>

        {/* right rail — reorder + delete */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
            aria-label="Pindah ke atas"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-text-tertiary hover:text-text-primary disabled:opacity-30"
            aria-label="Pindah ke bawah"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="text-text-tertiary hover:text-danger mt-1"
            aria-label="Hapus slide"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Local presentational helpers (mirroring InvoiceForm)               */
/* ------------------------------------------------------------------ */

const FormSection = ({
  eyebrow, title, description, children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <GlassPanel surface="glass" padding="lg">
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
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

const FieldLabel = ({
  children, required,
}: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
    {children}
    {required && <span className="text-text-tertiary ml-1">*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
