// =============================================================================
// Concurrency Controller for Batch AI Operations
// Progressive batching with controlled limits to prevent provider rate limiting
// =============================================================================

export function getAIConcurrencyLimit(): number {
  const envVal = process.env.AI_MAX_CONCURRENCY;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
      return parsed;
    }
  }
  return 3; // Safe default for high reliability
}

/**
 * Executes an array of asynchronous tasks with controlled concurrency.
 * Ensures that at most `maxConcurrency` tasks are running in parallel at any moment.
 */
export async function runWithControlledConcurrency<T, R>(
  items: T[],
  workerFn: (item: T, index: number) => Promise<R>,
  maxConcurrency: number = getAIConcurrencyLimit()
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      try {
        results[idx] = await workerFn(item, idx);
      } catch (err: any) {
        // Handled within workerFn or stored in results
        results[idx] = err as R;
      }
    }
  }

  const workersCount = Math.min(items.length, maxConcurrency);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workersCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}
