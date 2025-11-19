/**
 * Utility functions for handling API errors in a type-safe way
 */

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

/**
 * Extract error message from unknown error object
 */
export const getErrorMessage = (error: unknown, defaultMessage = 'An error occurred'): string => {
  if (typeof error === 'string') {
    return error;
  }

  const apiError = error as ApiError;

  return (
    apiError?.response?.data?.message ||
    apiError?.response?.data?.error ||
    apiError?.message ||
    defaultMessage
  );
};

/**
 * Check if error is an API error with status code
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  );
};

/**
 * Get status code from error
 */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (isApiError(error)) {
    return error.response?.status;
  }
  return undefined;
};
