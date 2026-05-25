import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Plus, Save, Trash2, Loader2, Film,
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

import { useAuthStore } from '@/store/auth';
import { shotListsApi } from '@/services/shotLists';
import type { Shot } from '@/types/shotList';

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
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
/*  Schema — flattened, single-scene model for v2.                     */
/*  Multi-scene authoring (scene grouping, INT/EXT/Day/Night metadata) */
/*  remains in the classic editor.                                     */
/* ------------------------------------------------------------------ */

const shotRowSchema = z.object({
  id:             z.string().optional(),
  shotNumber:     z.string().min(1, 'Wajib'),
  description:    z.string().optional(),
  shotType:       z.string().optional(), // e.g. CU / WS / MS
  cameraMovement: z.string().optional(), // e.g. Pan / Track / Static
  camera:         z.string().optional(),
  estimatedTime:  z.coerce.number().min(0).optional(), // minutes
  notes:          z.string().optional(),
});

const formSchema = z.object({
  name:        z.string().min(2, 'Nama minimal 2 karakter'),
  description: z.string().optional(),
  shots:       z.array(shotRowSchema),
});
type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const flattenShots = (scenes: Array<{ shots?: Shot[] }> | undefined): Shot[] => {
  if (!scenes?.length) return [];
  return scenes.flatMap((sc) => (sc.shots ?? []));
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ShotListEditorPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: shotList, isLoading, error, refetch } = useQuery({
    queryKey: ['shot-list', id],
    queryFn:  () => shotListsApi.getById(id!),
    enabled:  !!id,
  });

  /* ---------- defaults ---------- */
  const defaultValues = useMemo<FormValues>(() => {
    if (!shotList) {
      return { name: '', description: '', shots: [] };
    }
    return {
      name:        shotList.name,
      description: shotList.description ?? '',
      shots: flattenShots(shotList.scenes)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id:             s.id,
          shotNumber:     s.shotNumber,
          description:    s.description ?? '',
          shotType:       s.shotType ?? '',
          cameraMovement: s.cameraMovement ?? '',
          camera:         s.camera ?? '',
          estimatedTime:  s.estimatedTime ?? undefined,
          notes:          s.notes ?? '',
        })),
    };
  }, [shotList]);

  const {
    register, handleSubmit, control, reset, formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'shots' });

  /* ---------- save ---------- */
  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!id || !shotList) return;

      // 1. shot list meta
      await shotListsApi.update(id, {
        name:        values.name,
        description: values.description || undefined,
      });

      // 2. resolve/ensure a target scene exists. v2 treats all shots as
      //    living inside the first scene; create one if the list is empty.
      let sceneId = shotList.scenes?.[0]?.id;
      if (!sceneId) {
        const created = await shotListsApi.createScene({
          shotListId:  id,
          name:        'Scene 1',
          sceneNumber: '1',
          order:       0,
        });
        sceneId = created.id;
      }

      // 3. shot diff against the flattened original set
      const originalIds = new Set(flattenShots(shotList.scenes).map((s) => s.id));
      const keptIds     = new Set(values.shots.map((s) => s.id).filter(Boolean) as string[]);
      const toDelete    = [...originalIds].filter((sid) => !keptIds.has(sid));
      for (const sid of toDelete) {
        await shotListsApi.deleteShot(sid);
      }

      for (let i = 0; i < values.shots.length; i++) {
        const s = values.shots[i];
        const payload = {
          sceneId,
          shotNumber:     s.shotNumber,
          description:    s.description || undefined,
          shotType:       s.shotType || undefined,
          cameraMovement: s.cameraMovement || undefined,
          camera:         s.camera || undefined,
          estimatedTime:  s.estimatedTime ?? undefined,
          notes:          s.notes || undefined,
          order:          i,
        };
        if (s.id && originalIds.has(s.id)) {
          await shotListsApi.updateShot(s.id, payload);
        } else {
          await shotListsApi.createShot(payload);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', id] });
      queryClient.invalidateQueries({ queryKey: ['shot-lists'] });
      toast.success('Shot list disimpan');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menyimpan shot list');
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

  if (error || !shotList) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<Film className="h-12 w-12" />}
            title="Shot list tidak ditemukan"
            description={
              error instanceof Error
                ? error.message
                : 'Shot list ini mungkin sudah dihapus atau Anda tidak memiliki akses.'
            }
            action={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/v2/shot-lists')}>
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Shot List
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
  const projectLabel = shotList.project?.name ?? '—';

  /* ---------- render ---------- */
  return (
    <Shell user={user}>
      <PageContainer>
        <div className="mb-4">
          <Link
            to="/v2/shot-lists"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Shot List
          </Link>
        </div>

        <PageHeader
          title="Editor Shot List"
          description="Susun shot untuk proyek produksi. Setiap baris adalah satu pengambilan gambar."
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ─────────────────────────────────────────────────────────
              Identity header — name + read-only project context. We do
              not allow re-binding the project from here; that's a
              destructive edit deferred to the classic flow.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow="Identitas"
            title="Detail Shot List"
            description="Nama dan deskripsi muncul di daftar. Proyek terkait tidak bisa diubah di sini."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>Nama</FieldLabel>
                <Input
                  placeholder="Misal: Hari 1 — Eksterior"
                  {...register('name')}
                  className="bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.name}
                />
                <FieldError message={errors.name?.message} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel>Deskripsi</FieldLabel>
                <textarea
                  rows={2}
                  placeholder="Konteks ringkas (opsional)"
                  {...register('description')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Proyek</FieldLabel>
                <div className="h-9 px-3 flex items-center rounded-md border border-border-subtle bg-bg-sunken/60 text-sm text-text-secondary">
                  {projectLabel}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Jumlah Shot</FieldLabel>
                <div className="h-9 px-3 flex items-center rounded-md border border-border-subtle bg-bg-sunken/60 text-sm font-mono tabular-nums text-text-secondary">
                  {fields.length}
                </div>
              </div>
            </div>
          </FormSection>

          {/* ─────────────────────────────────────────────────────────
              Shot table — column rhythm: # → location/desc → type →
              camera/movement → duration → notes → remove. Header row
              uses the eyebrow uppercase tracking pattern from
              InvoiceForm line items so the editorial voice stays one.
             ───────────────────────────────────────────────────────── */}
          <FormSection
            eyebrow="Shot"
            title={`Baris Shot (${fields.length})`}
            description="Tambahkan shot satu per satu. Nomor shot bebas mengikuti konvensi tim Anda (mis. 1A, 12B)."
          >
            {fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border-subtle bg-bg-sunken/40 py-10 text-center">
                <p className="text-sm text-text-tertiary">
                  Belum ada shot. Tambahkan baris pertama untuk mulai menyusun.
                </p>
              </div>
            ) : (
              <>
                {/* Header — desktop only */}
                <div className="hidden lg:grid grid-cols-[60px_1fr_100px_140px_90px_1fr_32px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
                  <div>#</div>
                  <div>Deskripsi</div>
                  <div>Jenis</div>
                  <div>Kamera / Gerak</div>
                  <div className="text-right">Durasi</div>
                  <div>Catatan</div>
                  <div />
                </div>

                <div className="divide-y divide-border-subtle">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 lg:grid-cols-[60px_1fr_100px_140px_90px_1fr_32px] gap-3 py-3 items-start"
                    >
                      {/* shot number */}
                      <div className="space-y-1">
                        <Input
                          placeholder="1A"
                          {...register(`shots.${idx}.shotNumber` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-primary text-sm font-mono tabular-nums"
                          aria-invalid={!!errors.shots?.[idx]?.shotNumber}
                        />
                        <FieldError message={errors.shots?.[idx]?.shotNumber?.message} />
                      </div>

                      {/* description */}
                      <div className="space-y-1 min-w-0">
                        <Input
                          placeholder="Aksi / lokasi / subjek shot"
                          {...register(`shots.${idx}.description` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-primary text-sm placeholder:text-text-tertiary"
                        />
                      </div>

                      {/* shot type (CU, WS, MS) */}
                      <div>
                        <Input
                          placeholder="WS / CU"
                          {...register(`shots.${idx}.shotType` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-secondary text-sm uppercase tracking-wider"
                        />
                      </div>

                      {/* camera + movement combined */}
                      <div className="space-y-1.5">
                        <Input
                          placeholder="Kamera"
                          {...register(`shots.${idx}.camera` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-secondary text-xs h-8"
                        />
                        <Input
                          placeholder="Gerak (Pan / Track)"
                          {...register(`shots.${idx}.cameraMovement` as const)}
                          className="bg-bg-sunken border-border-subtle text-text-tertiary text-xs h-8"
                        />
                      </div>

                      {/* estimated time (minutes) */}
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          placeholder="min"
                          {...register(`shots.${idx}.estimatedTime` as const, { valueAsNumber: true })}
                          className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary text-sm"
                        />
                      </div>

                      {/* notes */}
                      <div>
                        <textarea
                          rows={2}
                          placeholder="Catatan kru / props / lensa"
                          {...register(`shots.${idx}.notes` as const)}
                          className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-1.5 text-xs text-text-secondary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                        />
                      </div>

                      {/* remove */}
                      <div className="flex items-center justify-end pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => remove(idx)}
                          className="text-text-tertiary hover:text-danger"
                          aria-label="Hapus shot"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    id:             undefined,
                    shotNumber:     String(fields.length + 1),
                    description:    '',
                    shotType:       '',
                    cameraMovement: '',
                    camera:         '',
                    estimatedTime:  undefined,
                    notes:          '',
                  })
                }
                className="border-border-subtle text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Shot
              </Button>
            </div>
          </FormSection>

          {/* sticky action bar */}
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
                  onClick={() => navigate('/v2/shot-lists')}
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

        {/* Deferred-feature callout — keeps expectations honest. */}
        <p className="mt-6 text-[11px] text-text-tertiary leading-relaxed">
          Catatan v2: pengelompokan scene (INT/EXT, Day/Night, lokasi),
          storyboard upload, status shot (planned/shot/wrapped), reorder
          drag-and-drop, dan ekspor PDF masih tersedia di tampilan klasik.
          Tampilan v2 fokus pada CRUD shot terstruktur dalam satu scene.
        </p>
      </PageContainer>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell helper                                                       */
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
/*  Local presentational helpers                                       */
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
