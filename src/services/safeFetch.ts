// =============================================================================
// Safe Fetch Utility for UIOutbox
// Enforces hard timeouts via AbortController, verifies application/json headers,
// and prevents HTML responses from triggering JSON syntax errors.
// =============================================================================

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  isTimeout?: boolean;
}

/**
 * Executes a fetch request with a strict timeout and robust JSON parsing.
 * Never throws syntax errors on HTML responses (e.g. 500 error pages).
 */
export async function safeJsonFetch<T = any>(
  url: string,
  options?: SafeFetchOptions
): Promise<SafeFetchResult<T>> {
  const timeoutMs = options?.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const { timeoutMs: _, signal: userSignal, ...fetchOptions } = options || {};

    // Combine user signal with timeout signal if provided
    let effectiveSignal = controller.signal;
    if (userSignal) {
      if (userSignal.aborted) {
        clearTimeout(timeoutId);
        return {
          ok: false,
          status: 499,
          error: 'Request aborted by caller.',
        };
      }
      userSignal.addEventListener('abort', () => controller.abort());
    }

    const response = await fetch(url, {
      ...fetchOptions,
      signal: effectiveSignal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    // Handle error HTTP status codes
    if (!response.ok) {
      let errorMsg = `Server error HTTP ${response.status}: ${response.statusText || 'Request failed'}`;

      if (isJson) {
        try {
          const errData = await response.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {
          // ignore parsing error
        }
      } else {
        try {
          const text = await response.text();
          if (text && !text.startsWith('<!doctype') && !text.startsWith('<html') && text.length < 250) {
            errorMsg = text.trim();
          } else {
            errorMsg = `Server returned HTML error (${response.status} ${response.statusText})`;
          }
        } catch {
          // ignore
        }
      }

      return {
        ok: false,
        status: response.status,
        error: errorMsg,
      };
    }

    // Response is OK (2xx)
    if (!isJson) {
      return {
        ok: false,
        status: response.status,
        error: `Expected JSON response but received ${contentType || 'non-JSON content'}.`,
      };
    }

    try {
      const data = await response.json();
      return {
        ok: true,
        status: response.status,
        data: data as T,
      };
    } catch (parseErr: any) {
      return {
        ok: false,
        status: response.status,
        error: `Failed to parse response JSON: ${parseErr.message || parseErr}`,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      return {
        ok: false,
        status: 408,
        isTimeout: true,
        error: `Request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      };
    }

    return {
      ok: false,
      status: 500,
      error: err.message || 'Network error occurred.',
    };
  }
}

/**
 * Wraps any promise with a hard timeout and optional fallback value.
 */
export async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number = 15000,
  fallbackValue?: T,
  operationName: string = 'Operation'
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    throw err;
  }
}
