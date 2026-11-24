const DEFAULT_SLOW_QUERY_MS = 100;

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

export function performanceLogsEnabled() {
  return process.env.PERFORMANCE_LOGS === 'true';
}

export function slowQueryThresholdMs() {
  const value = Number(process.env.PERFORMANCE_SLOW_QUERY_MS ?? DEFAULT_SLOW_QUERY_MS);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_SLOW_QUERY_MS;
}

export async function measureServer<T>(name: string, operation: () => Promise<T>) {
  if (!performanceLogsEnabled()) return operation();

  const startedAt = performance.now();
  try {
    const result = await operation();
    console.info('[perf]', JSON.stringify({ scope: 'server', name, durationMs: roundMs(performance.now() - startedAt), ok: true }));
    return result;
  } catch (error) {
    console.info('[perf]', JSON.stringify({ scope: 'server', name, durationMs: roundMs(performance.now() - startedAt), ok: false, error: error instanceof Error ? error.name : 'unknown' }));
    throw error;
  }
}

export function withRouteTiming<TArgs extends unknown[]>(name: string, handler: (...args: TArgs) => Promise<Response>) {
  return async (...args: TArgs) => {
    if (!performanceLogsEnabled()) return handler(...args);

    const startedAt = performance.now();
    try {
      const response = await handler(...args);
      const headers = new Headers(response.headers);
      headers.set('Server-Timing', `app;dur=${roundMs(performance.now() - startedAt)}`);
      console.info('[perf]', JSON.stringify({ scope: 'route', name, durationMs: roundMs(performance.now() - startedAt), status: response.status }));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    } catch (error) {
      console.info('[perf]', JSON.stringify({ scope: 'route', name, durationMs: roundMs(performance.now() - startedAt), ok: false, error: error instanceof Error ? error.name : 'unknown' }));
      throw error;
    }
  };
}
