import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { BulkDownloadJobCreated, BulkDownloadJobStatus } from '@/services/media-collab';

export interface BulkDownloadProgress {
  processedFiles: number;
  totalFiles: number;
  progress: number;
}

interface UseBulkDownloadJobOptions {
  /* eslint-disable no-unused-vars */
  createJob: (assetIds: string[], zipFilename?: string) => Promise<BulkDownloadJobCreated>;
  getStatus: (jobId: string) => Promise<BulkDownloadJobStatus>;
  /* eslint-enable no-unused-vars */
}

interface UseBulkDownloadJobResult {
  start: (ids: string[], zipFilename?: string) => Promise<void>; // eslint-disable-line no-unused-vars
  isPending: boolean;
  progress: BulkDownloadProgress | null;
}

type Outcome = { downloadUrl: string; archivedFiles: number };

const POLL_INTERVAL_MS = 2000;
// The largest projects are ~4.5k assets / several GB; the ZIP must also be uploaded
// to R2 before a URL exists. The server-side stall watchdog catches wedged jobs, so
// this ceiling only needs to be generous.
const MAX_WAIT_MS = 2 * 60 * 60 * 1000;
// A single failed poll (transient 502, network drop) must not abandon a job that is
// still running server-side.
const MAX_CONSECUTIVE_ERRORS = 10;

// Navigate to the presigned URL directly instead of fetching it into a blob —
// bulk ZIPs can be multi-gigabyte and must stream straight to disk.
function triggerFileDownload(url: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Async ZIP download: create job -> poll status -> trigger download.
 * Shared by the admin project page and the public share page.
 */
export function useBulkDownloadJob({ createJob, getStatus }: UseBulkDownloadJobOptions): UseBulkDownloadJobResult {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<BulkDownloadProgress | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const requestedRef = useRef(0);
  // Keep latest callbacks without re-creating the poller.
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const createJobRef = useRef(createJob);
  createJobRef.current = createJob;

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return (): void => {
      mountedRef.current = false;
      clearPoll();
    };
  }, [clearPoll]);

  const pollJob = useCallback(
    (jobId: string): Promise<Outcome> =>
      new Promise<Outcome>((resolve, reject) => {
        const startedAt = Date.now();
        let consecutiveErrors = 0;

        const poll = async (): Promise<void> => {
          try {
            const status = await getStatusRef.current(jobId);
            if (!mountedRef.current) return;
            consecutiveErrors = 0;

            if (status.status === 'completed' && status.downloadUrl != null && status.downloadUrl !== '') {
              clearPoll();
              setProgress({
                processedFiles: status.totalFiles,
                totalFiles: status.totalFiles,
                progress: 100,
              });
              resolve({ downloadUrl: status.downloadUrl, archivedFiles: status.processedFiles });
              return;
            }

            if (status.status === 'failed') {
              clearPoll();
              reject(
                new Error(
                  status.error != null && status.error !== ''
                    ? status.error
                    : t('mediaCollab.bulkDownloadJobFailed', 'Download failed on the server.'),
                ),
              );
              return;
            }

            if (status.status === 'cancelled') {
              clearPoll();
              reject(new Error(t('mediaCollab.bulkDownloadJobCancelled', 'Download was cancelled.')));
              return;
            }

            setProgress({
              processedFiles: status.processedFiles,
              totalFiles: status.totalFiles,
              progress: status.progress,
            });

            if (Date.now() - startedAt > MAX_WAIT_MS) {
              clearPoll();
              reject(
                new Error(
                  t('mediaCollab.bulkDownloadJobTimeout', 'Download is taking too long. Please try again later.'),
                ),
              );
            }
          } catch (err) {
            if (!mountedRef.current) return;

            consecutiveErrors += 1;
            const gaveUp = consecutiveErrors >= MAX_CONSECUTIVE_ERRORS;
            const timedOut = Date.now() - startedAt > MAX_WAIT_MS;
            if (!gaveUp && !timedOut) return;

            clearPoll();
            reject(
              err instanceof Error
                ? err
                : new Error(t('mediaCollab.bulkDownloadStatusError', 'Failed to check download status.')),
            );
          }
        };

        clearPoll();
        pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
        poll();
      }),
    [clearPoll, t],
  );

  const mutation = useMutation({
    mutationFn: async ({ ids, zipFilename }: { ids: string[]; zipFilename?: string }): Promise<Outcome> => {
      setProgress({ processedFiles: 0, totalFiles: ids.length, progress: 0 });
      requestedRef.current = ids.length;

      // Defensive: tolerate a malformed/empty response from the server.
      const created = (await createJobRef.current(ids, zipFilename)) as Partial<BulkDownloadJobCreated> | undefined;

      if (created?.jobId == null) {
        throw new Error(t('mediaCollab.bulkDownloadJobNoId', 'Server did not return a download job id.'));
      }

      if (created.downloadUrl != null && created.downloadUrl !== '') {
        const total = created.totalFiles ?? ids.length;
        setProgress({ processedFiles: total, totalFiles: total, progress: 100 });
        return { downloadUrl: created.downloadUrl, archivedFiles: total };
      }

      return pollJob(created.jobId);
    },
    onSuccess: ({ downloadUrl, archivedFiles }) => {
      triggerFileDownload(downloadUrl);

      // The server tolerates individual unreadable assets, so a job can succeed with
      // fewer files than requested. Say so rather than reporting a plain success.
      const requested = requestedRef.current;
      if (archivedFiles > 0 && requested > 0 && archivedFiles < requested) {
        toast.warning(
          t(
            'mediaCollab.bulkDownloadPartial',
            'Download started, but only {{archived}} of {{requested}} files could be included.',
            { archived: archivedFiles, requested },
          ),
        );
        return;
      }

      toast.success(t('mediaReview.bulkDownloadStarted', 'Download started.'));
    },
    onError: (error: unknown) => {
      clearPoll();
      const message = error instanceof Error && error.message !== '' ? error.message : undefined;
      toast.error(message ?? t('mediaReview.bulkDownloadFailed', 'Download failed.'));
    },
    onSettled: () => {
      setProgress(null);
    },
  });

  const { mutateAsync } = mutation;
  const start = useCallback(
    async (ids: string[], zipFilename?: string): Promise<void> => {
      try {
        await mutateAsync({ ids, zipFilename });
      } catch {
        // Already reported via the onError toast.
      }
    },
    [mutateAsync],
  );

  return { start, isPending: mutation.isPending, progress };
}
