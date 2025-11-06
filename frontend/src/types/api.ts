/**
 * Common API response types for type-safe API communication
 */

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  constraint?: string;
}

/**
 * Generic form state type
 */
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Common loading states
 */
export interface LoadingState {
  isLoading: boolean;
  error: ApiError | null;
}

/**
 * Generic async operation result
 */
export type AsyncResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
