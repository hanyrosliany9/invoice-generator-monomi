/**
 * Web Worker for heavy data aggregation operations
 * Offloads CPU-intensive calculations to a separate thread
 * Prevents UI freezing during large dataset processing
 */

interface AggregationMessage {
  type: 'aggregate' | 'sort' | 'filter' | 'group';
  data: any;
  requestId: string;
}

interface AggregationResult {
  type: 'result' | 'error';
  requestId: string;
  result?: any;
  error?: string;
}

// Type guard
function isAggregationMessage(data: any): data is AggregationMessage {
  return data && typeof data.type === 'string' && typeof data.requestId === 'string';
}

self.addEventListener('message', (e: MessageEvent) => {
  const message = e.data;

  if (!isAggregationMessage(message)) {
    self.postMessage({
      type: 'error',
      requestId: 'unknown',
      error: 'Invalid message format',
    });
    return;
  }

  try {
    let result: any;

    switch (message.type) {
      case 'aggregate':
        result = performAggregation(message.data);
        break;

      case 'sort':
        result = performSort(message.data);
        break;

      case 'filter':
        result = performFilter(message.data);
        break;

      case 'group':
        result = performGrouping(message.data);
        break;

      default:
        throw new Error(`Unknown operation type: ${message.type}`);
    }

    const response: AggregationResult = {
      type: 'result',
      requestId: message.requestId,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    const response: AggregationResult = {
      type: 'error',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    self.postMessage(response);
  }
});

/**
 * Perform aggregation operations (sum, avg, count, min, max)
 */
function performAggregation(data: {
  rows: any[];
  column: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';
}): number {
  const { rows, column, operation } = data;

  if (!rows || rows.length === 0) {
    return 0;
  }

  const values = rows
    .map(row => {
      const val = row[column];
      return typeof val === 'number' ? val : parseFloat(val);
    })
    .filter(val => !isNaN(val));

  if (values.length === 0) {
    return 0;
  }

  switch (operation) {
    case 'sum':
      return values.reduce((acc, val) => acc + val, 0);

    case 'avg':
      return values.reduce((acc, val) => acc + val, 0) / values.length;

    case 'count':
      return values.length;

    case 'min':
      return Math.min(...values);

    case 'max':
      return Math.max(...values);

    case 'median':
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

/**
 * Perform sorting operations
 */
function performSort(data: {
  rows: any[];
  column: string;
  direction: 'asc' | 'desc';
  dataType?: 'number' | 'string' | 'date';
}): any[] {
  const { rows, column, direction, dataType = 'string' } = data;

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    let comparison = 0;

    switch (dataType) {
      case 'number':
        comparison = parseFloat(aVal) - parseFloat(bVal);
        break;

      case 'date':
        comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
        break;

      case 'string':
      default:
        comparison = String(aVal).localeCompare(String(bVal));
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Perform filtering operations
 */
function performFilter(data: {
  rows: any[];
  filters: Array<{
    column: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
  }>;
}): any[] {
  const { rows, filters } = data;

  return rows.filter(row => {
    return filters.every(filter => {
      const cellValue = row[filter.column];
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'eq':
          return cellValue === filterValue;

        case 'ne':
          return cellValue !== filterValue;

        case 'gt':
          return cellValue > filterValue;

        case 'gte':
          return cellValue >= filterValue;

        case 'lt':
          return cellValue < filterValue;

        case 'lte':
          return cellValue <= filterValue;

        case 'contains':
          return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());

        case 'startsWith':
          return String(cellValue).toLowerCase().startsWith(String(filterValue).toLowerCase());

        case 'endsWith':
          return String(cellValue).toLowerCase().endsWith(String(filterValue).toLowerCase());

        default:
          return true;
      }
    });
  });
}

/**
 * Perform grouping operations
 */
function performGrouping(data: {
  rows: any[];
  groupBy: string;
  aggregations?: Array<{
    column: string;
    operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
    alias?: string;
  }>;
}): any[] {
  const { rows, groupBy, aggregations = [] } = data;

  const grouped = new Map<any, any[]>();

  // Group rows
  rows.forEach(row => {
    const key = row[groupBy];
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });

  // Perform aggregations
  const result: any[] = [];

  grouped.forEach((groupRows, key) => {
    const groupResult: any = {
      [groupBy]: key,
      _count: groupRows.length,
    };

    aggregations.forEach(agg => {
      const aggResult = performAggregation({
        rows: groupRows,
        column: agg.column,
        operation: agg.operation,
      });

      const resultKey = agg.alias || `${agg.operation}_${agg.column}`;
      groupResult[resultKey] = aggResult;
    });

    result.push(groupResult);
  });

  return result;
}

// Export for TypeScript
export {};
