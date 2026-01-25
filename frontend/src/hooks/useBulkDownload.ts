import { useState, useEffect, useCallback, useRef } from 'react';
import { websocketService } from '../services/websocket';
import {
  mediaCollabService,
  BulkDownloadJobCreated,
  BulkDownloadJobStatus,
  BulkDownloadProgressEvent,
  BulkDownloadCompleteEvent,
  BulkDownloadFailedEvent,
} from '../services/media-collab';

/**
 * Threshold for using async download (file count)
 * Below this, use synchronous streaming download
 */
const ASYNC_DOWNLOAD_THRESHOLD = 50;

export interface UseBulkDownloadState {
  isDownloading: boolean;
  jobId: string | null;
  progress: number;
  processedFiles: number;
  totalFiles: number;
  currentFile: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  error: string | null;
  status: 'idle' | 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
}

export interface UseBulkDownloadReturn extends UseBulkDownloadState {
  startDownload: (assetIds: string[], projectId: string, zipFilename?: string) => Promise<void>;
  cancelDownload: () => Promise<void>;
  reset: () => void;
  triggerDownload: () => void;
}

/**
 * useBulkDownload Hook
 *
 * Manages bulk download state and WebSocket events for async downloads.
 * Automatically chooses between sync (for small downloads) and async (for large downloads).
 *
 * @example
 * const { startDownload, isDownloading, progress, downloadUrl, error } = useBulkDownload();
 *
 * // Start a download
 * await startDownload(selectedAssetIds, projectId);
 *
 * // Download will automatically trigger when complete, or use:
 * if (downloadUrl) triggerDownload();
 */
export const useBulkDownload = (): UseBulkDownloadReturn => {
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

  // Track if auto-download has been triggered
  const autoDownloadTriggered = useRef(false);

  /**
   * Handle progress events from WebSocket
   */
  const handleProgress = useCallback((data: BulkDownloadProgressEvent) => {
    setState((prev) => {
      // Only update if it's our job
      if (prev.jobId !== data.jobId) return prev;

      return {
        ...prev,
        progress: data.percent,
        processedFiles: data.current,
        totalFiles: data.total,
        currentFile: data.currentFile || null,
        status: 'active',
      };
    });
  }, []);

  /**
   * Handle completion events from WebSocket
   */
  const handleComplete = useCallback((data: BulkDownloadCompleteEvent) => {
    setState((prev) => {
      // Only update if it's our job
      if (prev.jobId !== data.jobId) return prev;

      return {
        ...prev,
        isDownloading: false,
        progress: 100,
        processedFiles: data.fileCount,
        totalFiles: data.fileCount,
        downloadUrl: data.downloadUrl,
        expiresAt: data.expiresAt,
        status: 'completed',
      };
    });

    // Auto-trigger download
    autoDownloadTriggered.current = true;
    window.open(data.downloadUrl, '_blank');
  }, []);

  /**
   * Handle failure events from WebSocket
   */
  const handleFailed = useCallback((data: BulkDownloadFailedEvent) => {
    setState((prev) => {
      // Only update if it's our job
      if (prev.jobId !== data.jobId) return prev;

      return {
        ...prev,
        isDownloading: false,
        error: data.error,
        status: 'failed',
      };
    });
  }, []);

  /**
   * Setup WebSocket listeners
   */
  useEffect(() => {
    // Subscribe to bulk download events
    const socket = (websocketService as any).socket;
    if (socket) {
      socket.on('bulk-download:progress', handleProgress);
      socket.on('bulk-download:complete', handleComplete);
      socket.on('bulk-download:failed', handleFailed);
    }

    return () => {
      // Cleanup listeners
      if (socket) {
        socket.off('bulk-download:progress', handleProgress);
        socket.off('bulk-download:complete', handleComplete);
        socket.off('bulk-download:failed', handleFailed);
      }
    };
  }, [handleProgress, handleComplete, handleFailed]);

  /**
   * Start a bulk download
   * Automatically chooses sync or async based on file count
   */
  const startDownload = useCallback(
    async (assetIds: string[], projectId: string, zipFilename?: string): Promise<void> => {
      // Reset state
      autoDownloadTriggered.current = false;
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
        // For small downloads, use synchronous streaming
        if (assetIds.length < ASYNC_DOWNLOAD_THRESHOLD) {
          console.log('[useBulkDownload] Using sync download for', assetIds.length, 'files');
          await mediaCollabService.bulkDownloadAssets(assetIds, zipFilename);
          setState((prev) => ({
            ...prev,
            isDownloading: false,
            progress: 100,
            status: 'completed',
          }));
          return;
        }

        // For large downloads, use async job queue
        console.log('[useBulkDownload] Using async download for', assetIds.length, 'files');

        // Ensure WebSocket is connected
        const token = localStorage.getItem('access_token');
        if (token && !websocketService.isConnected()) {
          websocketService.connect(token);
        }

        // Create async job
        const result: BulkDownloadJobCreated = await mediaCollabService.createBulkDownloadJob(
          assetIds,
          projectId,
          zipFilename,
        );

        setState((prev) => ({
          ...prev,
          jobId: result.jobId,
          totalFiles: result.totalFiles,
          status: result.status === 'pending' ? 'pending' : 'active',
        }));

        console.log('[useBulkDownload] Job created:', result.jobId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[useBulkDownload] Error:', errorMessage);
        setState((prev) => ({
          ...prev,
          isDownloading: false,
          error: errorMessage,
          status: 'failed',
        }));
        throw error;
      }
    },
    [],
  );

  /**
   * Cancel the current download job
   */
  const cancelDownload = useCallback(async (): Promise<void> => {
    if (!state.jobId) {
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        status: 'cancelled',
      }));
      return;
    }

    try {
      await mediaCollabService.cancelBulkDownloadJob(state.jobId);
      setState((prev) => ({
        ...prev,
        isDownloading: false,
        status: 'cancelled',
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [state.jobId]);

  /**
   * Reset the hook state
   */
  const reset = useCallback((): void => {
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
  }, []);

  /**
   * Manually trigger download if URL is available
   */
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

export default useBulkDownload;
