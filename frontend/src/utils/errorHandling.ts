/**
 * Type guard to check if an error is an Axios error with response
 */
export function isAxiosError(error: any): error is { response: { data: { message: string } } } {
  return error && error.response && error.response.data;
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  if (isAxiosError(error)) {
    return error.response.data.message || defaultMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}
