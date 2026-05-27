const TRANSIENT_PATTERNS = ['timeout', 'Timeout', 'nonce', 'Nonce', 'mempool', 'network', 'fetch', 'abort', 'rate limit', 'TooManyRequests', 'ServiceUnavailable'];

const PERMANENT_PATTERNS = ['cancelled', 'Cancelled', 'User rejected', 'InsufficientFunds', 'ERR_', 'not found', 'NotAuthorized', 'AlreadyExists'];

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 2000,
  maxDelayMs: 8000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  const msg = typeof error === 'string' ? error : JSON.stringify(error);
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

function isPermanentError(error: unknown): boolean {
  const msg = typeof error === 'string' ? error : JSON.stringify(error);
  return PERMANENT_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

export async function withTransactionRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, onRetry } = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (isPermanentError(error)) throw error;
      if (attempt === maxAttempts || !isTransientError(error)) throw error;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      if (onRetry) onRetry(attempt, error, delay);
      await sleep(delay);
    }
  }
  throw lastError;
}

export function isPermanentTxError(error: unknown): boolean {
  return isPermanentError(error);
}

export function isTransientTxError(error: unknown): boolean {
  return isTransientError(error);
}
