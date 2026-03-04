import { useState, useCallback, useEffect, useRef } from 'react';
import { mediaCollabService } from '../services/media-collab';
import type { UseBulkDownloadState, UseBulkDownloadReturn } from './useBulkDownload';

const POLL_INTERVAL_MS = 2000;

/**
 * usePublicBulkDownload
 *
 * Async bulk download for public share pages — no auth token required.
 * Uses polling instead of WebSocket to track job progress.
 *
 * Mirrors the UseBulkDownloadReturn interface from useBulkDownload so the
 * same BulkDownloadModal component can be reused.
 */
export const usePublicBulkDownload = (shareToken: string): UseBulkDownloadReturn => {
  const [state, setState] = useState<UseBulkDownloadState>({
    isDownloading: false,
    jobId: null,
    progress: 0,
    processedFiles: 0,
    totalFiles: 0,
    currentFile: null,
    downloadUrl: null,
    expiresAt: null,
    error: null,
    status: 'idle',
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDownloadTriggered = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const status = await mediaCollabService.getPublicBulkDownloadJobStatus(shareToken, jobId);

      if (status.status === 'completed') {
        stopPolling();
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          progress: 100,
          processedFiles: status.processedFiles ?? prev.processedFiles,
          totalFiles: status.totalFiles ?? prev.totalFiles,
          downloadUrl: status.downloadUrl ?? null,
          expiresAt: status.expiresAt ?? null,
          status: 'completed',
        }));
        // Auto-open download
        if (status.downloadUrl && !autoDownloadTriggered.current) {
          autoDownloadTriggered.current = true;
          window.open(status.downloadUrl, '_blank');
        }
      } else if (status.status === 'failed') {
        stopPolling();
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          error: status.error ?? 'Download failed',
          status: 'failed',
        }));
      } else {
        // pending or active
        setState((prev) => ({
          ...prev,
          progress: status.progress ?? prev.progress,
          processedFiles: status.processedFiles ?? prev.processedFiles,
          totalFiles: status.totalFiles ?? prev.totalFiles,
          status: status.status as UseBulkDownloadState['status'],
        }));
      }
    } catch (error) {
      // Don't stop polling on transient network errors — just log
      console.warn('[usePublicBulkDownload] Poll error:', error);
    }
  }, [shareToken, stopPolling]);

  const startDownload = useCallback(async (
    assetIds: string[],
    _projectId: string,
    zipFilename?: string,
  ): Promise<void> => {
    autoDownloadTriggered.current = false;
    stopPolling();

    setState({
      isDownloading: true,
      jobId: null,
      progress: 0,
      processedFiles: 0,
      totalFiles: assetIds.length,
      currentFile: null,
      downloadUrl: null,
      expiresAt: null,
      error: null,
      status: 'pending',
    });

    try {
      const result = await mediaCollabService.createPublicBulkDownloadJob(
        shareToken,
        assetIds,
        zipFilename,
      );

      // Cache hit — already completed
      if (result.status === 'completed' && result.downloadUrl) {
        autoDownloadTriggered.current = true;
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          jobId: result.jobId,
          progress: 100,
          totalFiles: result.totalFiles ?? assetIds.length,
          downloadUrl: result.downloadUrl ?? null,
          expiresAt: result.expiresAt ?? null,
          status: 'completed',
        }));
        window.open(result.downloadUrl, '_blank');
        return;
      }

      setState((prev) => ({
        ...prev,
        jobId: result.jobId,
        totalFiles: result.totalFiles ?? assetIds.length,
        status: 'pending',
      }));

      // Start polling
      pollIntervalRef.current = setInterval(() => pollStatus(result.jobId), POLL_INTERVAL_MS);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        error: errorMessage,
        status: 'failed',
      }));
      throw error;
    }
  }, [shareToken, stopPolling, pollStatus]);

  const cancelDownload = useCallback(async (): Promise<void> => {
    stopPolling();
    setState((prev) => ({
      ...prev,
      isDownloading: false,
      status: 'cancelled',
    }));
    // Note: backend job will eventually complete and the ZIP will be cached,
    // but the user won't receive it — acceptable for public cancellation.
  }, [stopPolling]);

  const reset = useCallback((): void => {
    stopPolling();
    autoDownloadTriggered.current = false;
    setState({
      isDownloading: false,
      jobId: null,
      progress: 0,
      processedFiles: 0,
      totalFiles: 0,
      currentFile: null,
      downloadUrl: null,
      expiresAt: null,
      error: null,
      status: 'idle',
    });
  }, [stopPolling]);

  const triggerDownload = useCallback((): void => {
    if (state.downloadUrl) {
      window.open(state.downloadUrl, '_blank');
    }
  }, [state.downloadUrl]);

  return {
    ...state,
    startDownload,
    cancelDownload,
    reset,
    triggerDownload,
  };
};

export default usePublicBulkDownload;
