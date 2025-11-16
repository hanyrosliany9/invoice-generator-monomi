import { useRef, useCallback, useEffect } from 'react';

interface WorkerRequest {
  type: 'aggregate' | 'sort' | 'filter' | 'group';
  data: any;
  requestId: string;
}

interface WorkerResponse {
  type: 'result' | 'error';
  requestId: string;
  result?: any;
  error?: string;
}

/**
 * Hook to use Web Worker for heavy data operations
 * Automatically handles worker lifecycle and communication
 */
export const useDataWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>>(new Map());
  const requestCounter = useRef(0);

  // Initialize worker
  useEffect(() => {
    // Create worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/dataAggregation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Handle messages from worker
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { requestId, type, result, error } = e.data;
        const pending = pendingRequests.current.get(requestId);

        if (!pending) {
          console.warn('[useDataWorker] Received response for unknown request:', requestId);
          return;
        }

        pendingRequests.current.delete(requestId);

        if (type === 'result') {
          pending.resolve(result);
        } else {
          pending.reject(new Error(error || 'Unknown worker error'));
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('[useDataWorker] Worker error:', error);
        // Reject all pending requests
        pendingRequests.current.forEach(({ reject }) => {
          reject(new Error('Worker crashed'));
        });
        pendingRequests.current.clear();
      };
    } catch (error) {
      console.error('[useDataWorker] Failed to create worker:', error);
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRequests.current.clear();
    };
  }, []);

  // Send request to worker
  const sendRequest = useCallback((type: WorkerRequest['type'], data: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const requestId = `req_${++requestCounter.current}_${Date.now()}`;
      pendingRequests.current.set(requestId, { resolve, reject });

      const message: WorkerRequest = { type, data, requestId };
      workerRef.current.postMessage(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.current.has(requestId)) {
          pendingRequests.current.delete(requestId);
          reject(new Error('Worker request timeout'));
        }
      }, 30000);
    });
  }, []);

  // Aggregate data
  const aggregate = useCallback(
    (rows: any[], column: string, operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'): Promise<number> => {
      return sendRequest('aggregate', { rows, column, operation });
    },
    [sendRequest]
  );

  // Sort data
  const sort = useCallback(
    (rows: any[], column: string, direction: 'asc' | 'desc', dataType?: 'number' | 'string' | 'date'): Promise<any[]> => {
      return sendRequest('sort', { rows, column, direction, dataType });
    },
    [sendRequest]
  );

  // Filter data
  const filter = useCallback(
    (
      rows: any[],
      filters: Array<{
        column: string;
        operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
        value: any;
      }>
    ): Promise<any[]> => {
      return sendRequest('filter', { rows, filters });
    },
    [sendRequest]
  );

  // Group data
  const group = useCallback(
    (
      rows: any[],
      groupBy: string,
      aggregations?: Array<{
        column: string;
        operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
        alias?: string;
      }>
    ): Promise<any[]> => {
      return sendRequest('group', { rows, groupBy, aggregations });
    },
    [sendRequest]
  );

  return {
    aggregate,
    sort,
    filter,
    group,
    isReady: !!workerRef.current,
  };
};
