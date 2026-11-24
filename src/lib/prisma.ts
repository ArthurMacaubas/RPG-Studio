import { PrismaClient } from '@prisma/client';
import { performanceLogsEnabled, slowQueryThresholdMs } from '@/lib/performance';

// Standard Next.js dev-mode singleton to avoid exhausting Postgres
// connections on hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; performanceMiddlewareInstalled?: boolean };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (!globalForPrisma.performanceMiddlewareInstalled) {
  prisma.$use(async (params, next) => {
    const startedAt = performance.now();
    try {
      const result = await next(params);
      const durationMs = performance.now() - startedAt;
      if (performanceLogsEnabled() && durationMs >= slowQueryThresholdMs()) {
        console.info('[perf]', JSON.stringify({
          scope: 'query',
          model: params.model ?? 'unknown',
          action: params.action,
          durationMs: Math.round(durationMs * 100) / 100
        }));
      }
      return result;
    } catch (error) {
      if (performanceLogsEnabled()) {
        console.info('[perf]', JSON.stringify({
          scope: 'query',
          model: params.model ?? 'unknown',
          action: params.action,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
          ok: false,
          error: error instanceof Error ? error.name : 'unknown'
        }));
      }
      throw error;
    }
  });
  globalForPrisma.performanceMiddlewareInstalled = true;
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
