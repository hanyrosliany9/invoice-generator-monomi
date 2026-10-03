/**
 * "Ambil dari Instagram" in the report builder: preview the sections built
 * from the client's synced Instagram data for the report month (daily table,
 * top content, headline numbers) and add the chosen ones. The server builds
 * them through the same parser as manual entry, so they render exactly like
 * typed/CSV sections in the builder, portal and PDF.
 *
 * Headline numbers based on less than 80% of the month's days are left out
 * unless staff ticks "include incomplete data"; re-adding sections that the
 * report already has replaces them (after a confirmation) instead of
 * duplicating them.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Info, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { InstagramIcon } from '@/components/instagram/InstagramDisconnectDialog';
import type { ImportedSection } from '@/types/report';
import {
  instagramService,
  type InstagramReportPreview,
  type InstagramSectionKey,
} from '@/services/instagram';
import { DataPreviewTable, KindChip } from './ReportDataPreview';
import { reportErrorText } from './ReportActionDialogs';

export function useInstagramReportPreview(reportId: string, enabled: boolean, includePartial = false) {
  return useQuery<InstagramReportPreview>({
    queryKey: ['instagram-report-preview', reportId, includePartial],
    queryFn: () => instagramService.reportPreview(reportId, includePartial),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function InstagramImportPanel({
  reportId,
  preview: basePreview,
  onAdded,
}: {
  reportId: string;
  preview: InstagramReportPreview;
  onAdded: (sections: ImportedSection[]) => void;
}) {
  const { t } = useTranslation();
  const [includePartial, setIncludePartial] = useState(false);
  const partial = useInstagramReportPreview(reportId, includePartial, true);
  const preview = includePartial && partial.data ? partial.data : basePreview;
  const available = preview.sections.filter((s) => !s.empty).map((s) => s.key);
  const [picked, setPicked] = useState<InstagramSectionKey[]>(available);
  const [confirmReplace, setConfirmReplace] = useState(false);
  useEffect(() => setPicked(preview.sections.filter((s) => !s.empty).map((s) => s.key)), [preview]);

  const anyOmitted = basePreview.sections.some((s) => s.hasOmitted) || includePartial;
  const clashing = (basePreview.existing ?? []).filter((e) => e.key !== null && picked.includes(e.key));

  const add = useMutation({
    mutationFn: (replace: boolean) => instagramService.addReportSections(reportId, picked, { replace, includePartial }),
    onSuccess: (r) => {
      setConfirmReplace(false);
      if (r.created.length > 0) {
        toast.success(t('reportData.instagram.added', '{{count}} bagian Instagram ditambahkan.', { count: r.created.length }));
      }
      if (r.replaced.length > 0) {
        toast.success(t('reportData.instagram.replaced', '{{count}} bagian Instagram diperbarui.', { count: r.replaced.length }));
      }
      void partial.refetch();
      onAdded([...r.created, ...r.replaced]);
    },
    onError: (e) => {
      setConfirmReplace(false);
      toast.error(reportErrorText(e, t('reportBuilder.sectionAddFailed', 'Failed to add section.')));
    },
  });

  const submit = () => {
    if (clashing.length > 0) setConfirmReplace(true);
    else add.mutate(false);
  };

  const toggle = (k: InstagramSectionKey, on: boolean) =>
    setPicked((cur) => (on ? Array.from(new Set([...cur, k])) : cur.filter((x) => x !== k)));

  const conn = preview.connection;
  return (
    <div className="space-y-3" data-testid="instagram-import-panel">
      {conn && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <InstagramIcon className="h-3.5 w-3.5" />
          <span className="font-medium text-text-primary">@{conn.username}</span>
          <span>·</span>
          <span>
            {t('reportData.instagram.lastSync', 'Sinkronisasi terakhir')}: <DateDisplay date={conn.lastSyncAt ?? null} format="long" />
          </span>
          {conn.status !== 'ACTIVE' && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('reportData.instagram.inactive', 'Koneksi tidak aktif — memakai data yang sudah tersimpan.')}
            </span>
          )}
        </div>
      )}

      {anyOmitted && available.length > 0 && (
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border-subtle bg-bg-base p-3 text-xs text-text-secondary">
          <Checkbox
            checked={includePartial}
            onCheckedChange={(v) => setIncludePartial(v === true)}
            className="mt-0.5"
            data-testid="instagram-include-partial"
          />
          <span>
            <span className="block font-medium text-text-primary">
              {t('reportData.instagram.includePartial', 'Sertakan metrik dengan data tidak lengkap')}
              {includePartial && partial.isFetching && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </span>
            {t(
              'reportData.instagram.includePartialHint',
              'Metrik yang datanya kurang dari 80% hari bulan ini disembunyikan secara bawaan. Centang untuk tetap menampilkannya (ditandai di deskripsi bagian).',
            )}
          </span>
        </label>
      )}

      {available.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-subtle p-4 text-center text-xs text-text-tertiary">
          {t('reportData.instagram.noData', 'Belum ada data Instagram untuk bulan laporan ini. Jalankan "Sync sekarang" di halaman klien, atau pilih bulan lain.')}
        </p>
      ) : (
        preview.sections.map((s) => (
          <div key={s.key} className="space-y-2 rounded-md border border-border-subtle bg-bg-base p-3">
            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={picked.includes(s.key)}
                disabled={s.empty}
                onCheckedChange={(v) => toggle(s.key, v === true)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">{s.title}</span>
                <span className="block text-[11px] text-text-tertiary">
                  {s.empty
                    ? t('reportData.instagram.sectionEmpty', 'Tidak ada data bulan ini')
                    : t('reportData.instagram.sectionSummary', '{{rows}} baris, {{charts}} grafik', { rows: s.rowCount, charts: s.chartCount })}
                </span>
              </span>
            </label>
            {(s.notes ?? []).length > 0 && (
              <ul className="space-y-1 rounded-md bg-warning/5 p-2 text-[11px] leading-relaxed text-text-secondary" data-testid={`instagram-notes-${s.key}`}>
                {s.notes.map((n) => (
                  <li key={n} className="flex items-start gap-1.5">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
            {!s.empty && (
              <>
                <p className="text-[11px] leading-relaxed text-text-tertiary">{s.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.headers.map((h) => (
                    <KindChip key={h} name={h} kind={s.columnKinds[h] ?? 'text'} />
                  ))}
                </div>
                <DataPreviewTable headers={s.headers} kinds={s.columnKinds} rows={s.rows} total={s.rowCount} maxRows={5} />
              </>
            )}
          </div>
        ))
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={add.isPending || picked.length === 0}>
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t('reportData.instagram.add', 'Tambahkan bagian Instagram')}
        </Button>
      </div>

      <Dialog open={confirmReplace} onOpenChange={(o) => { if (!o) setConfirmReplace(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('reportData.instagram.replaceTitle', 'Ganti bagian Instagram yang sudah ada?')}</DialogTitle>
            <DialogDescription>
              {t(
                'reportData.instagram.replaceBody',
                'Laporan ini sudah memiliki bagian Instagram: {{titles}}. Bagian tersebut akan diperbarui dengan data terbaru (grafik yang Anda ubah dikembalikan ke bawaan).',
                { titles: clashing.map((c) => c.title).join(', ') },
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirmReplace(false)} disabled={add.isPending}>
              {t('common.cancel', 'Batal')}
            </Button>
            <Button type="button" onClick={() => add.mutate(true)} disabled={add.isPending} data-testid="instagram-replace-confirm">
              {add.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('reportData.instagram.replaceConfirm', 'Ganti dengan data terbaru')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
