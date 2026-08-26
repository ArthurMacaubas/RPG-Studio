import { describe, expect, it } from 'vitest';
import { DistinctIpPerEmailLimiter, InMemoryRateLimiter } from './requestRateLimit';

const policy = {
  windowMs: 1_000,
  maxFailures: 3,
  initialBlockMs: 2_000,
  maximumBlockMs: 8_000,
  maxEntries: 100
};

describe('InMemoryRateLimiter', () => {
  it('bloqueia após o limite de falhas e informa a espera', () => {
    const limiter = new InMemoryRateLimiter(policy);

    expect(limiter.registerFailure('login:ip:127.0.0.1', 0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.registerFailure('login:ip:127.0.0.1', 10)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.registerFailure('login:ip:127.0.0.1', 20)).toEqual({ allowed: false, retryAfterSeconds: 2 });
    expect(limiter.assess('login:ip:127.0.0.1', 1_000)).toEqual({ allowed: false, retryAfterSeconds: 2 });
    expect(limiter.assess('login:ip:127.0.0.1', 2_020)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it('aumenta o bloqueio após reincidência e limpa falhas após sucesso', () => {
    const limiter = new InMemoryRateLimiter(policy);
    const key = 'register:email:ana@example.com';

    limiter.registerFailure(key, 0);
    limiter.registerFailure(key, 1);
    expect(limiter.registerFailure(key, 2)).toEqual({ allowed: false, retryAfterSeconds: 2 });
    limiter.assess(key, 2_100);
    limiter.registerFailure(key, 2_101);
    limiter.registerFailure(key, 2_102);
    expect(limiter.registerFailure(key, 2_103)).toEqual({ allowed: false, retryAfterSeconds: 4 });
    limiter.clear(key);
    expect(limiter.assess(key, 2_104)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});

describe('DistinctIpPerEmailLimiter', () => {
  it('bloqueia uma nova origem após o limite de IPs distintos para o mesmo e-mail', () => {
    const limiter = new DistinctIpPerEmailLimiter({ windowMs: 1_000, maxDistinctIps: 2, maxEntries: 100 });
    const emailKey = 'login:email:ana@example.com';

    expect(limiter.registerAttempt(emailKey, '198.51.100.10', 0)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.registerAttempt(emailKey, '198.51.100.11', 10)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.assess(emailKey, '198.51.100.12', 20)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.assess(emailKey, '198.51.100.10', 20)).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(limiter.assess(emailKey, '198.51.100.12', 1_001)).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });
});
