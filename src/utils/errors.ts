/** Error raised when the network is unreachable (fetch rejected). */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
    if (cause !== undefined) (this as {cause?: unknown}).cause = cause;
  }
}

/** Text of anything thrown: graders and servers may reject with plain strings. */
export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || String(error);
  if (error && typeof (error as {message?: unknown}).message === 'string') return (error as {message: string}).message;
  return String(error);
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof NetworkError || errorMessage(error) === 'Network request failed';
}
