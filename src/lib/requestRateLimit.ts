export type RateLimitPolicy = {
  windowMs: number;
  maxFailures: number;
  initialBlockMs: number;
  maximumBlockMs: number;
  maxEntries: number;
};

export type RateLimitAssessment = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type DistinctIpPolicy = {
  windowMs: number;
  maxDistinctIps: number;
  maxEntries: number;
};

type RateLimitRecord = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
  penaltyLevel: number;
  lastSeenAt: number;
};

const DEFAULT_POLICY: RateLimitPolicy = {
  windowMs: 15 * 60 * 1000,
  maxFailures: 5,
  initialBlockMs: 60 * 1000,
  maximumBlockMs: 30 * 60 * 1000,
  maxEntries: 10_000
};

const DEFAULT_DISTINCT_IP_POLICY: DistinctIpPolicy = {
  windowMs: 15 * 60 * 1000,
  maxDistinctIps: 4,
  maxEntries: 10_000
};

function retryAfterSeconds(blockedUntil: number, now: number) {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000));
}

/**
 * Limitador local para fluxos de autenticação. Ele é intencionalmente sem
 * persistência: a proteção funciona por instância e não introduz Redis ou outro
 * serviço externo antes de haver uma necessidade operacional para isso.
 */
export class InMemoryRateLimiter {
  private readonly records = new Map<string, RateLimitRecord>();

  constructor(private readonly policy: RateLimitPolicy = DEFAULT_POLICY) {}

  assess(key: string, now = Date.now()): RateLimitAssessment {
    const record = this.records.get(key);
    if (!record) return { allowed: true, retryAfterSeconds: 0 };

    record.lastSeenAt = now;
    if (record.blockedUntil > now) {
      return { allowed: false, retryAfterSeconds: retryAfterSeconds(record.blockedUntil, now) };
    }

    if (record.windowStartedAt + this.policy.windowMs <= now) {
      record.failures = 0;
      record.windowStartedAt = now;
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }

  registerFailure(key: string, now = Date.now()): RateLimitAssessment {
    let record = this.records.get(key);
    if (!record) {
      this.pruneIfNeeded();
      record = { failures: 0, windowStartedAt: now, blockedUntil: 0, penaltyLevel: 0, lastSeenAt: now };
      this.records.set(key, record);
    }

    const current = this.assess(key, now);
    if (!current.allowed) return current;

    record.lastSeenAt = now;
    record.failures += 1;
    if (record.failures < this.policy.maxFailures) return { allowed: true, retryAfterSeconds: 0 };

    record.penaltyLevel += 1;
    const blockMs = Math.min(this.policy.initialBlockMs * 2 ** (record.penaltyLevel - 1), this.policy.maximumBlockMs);
    record.blockedUntil = now + blockMs;
    record.failures = 0;
    record.windowStartedAt = now;
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(record.blockedUntil, now) };
  }

  clear(key: string) {
    this.records.delete(key);
  }

  private pruneIfNeeded() {
    if (this.records.size < this.policy.maxEntries) return;
    let oldestKey: string | undefined;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [key, record] of this.records) {
      if (record.lastSeenAt < oldestSeenAt) {
        oldestKey = key;
        oldestSeenAt = record.lastSeenAt;
      }
    }
    if (oldestKey) this.records.delete(oldestKey);
  }
}

/**
 * Impede que um mesmo e-mail contorne a proteção rotacionando o IP reportado.
 * A janela é curta e a limpeza por sucesso evita reter atividade legítima.
 */
export class DistinctIpPerEmailLimiter {
  private readonly records = new Map<string, { ips: Map<string, number>; windowStartedAt: number; lastSeenAt: number }>();

  constructor(private readonly policy: DistinctIpPolicy = DEFAULT_DISTINCT_IP_POLICY) {}

  assess(emailKey: string, ip: string, now = Date.now()): RateLimitAssessment {
    const record = this.records.get(emailKey);
    if (!record) return { allowed: true, retryAfterSeconds: 0 };

    record.lastSeenAt = now;
    if (record.windowStartedAt + this.policy.windowMs <= now) {
      record.ips.clear();
      record.windowStartedAt = now;
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (record.ips.has(ip) || record.ips.size < this.policy.maxDistinctIps) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(record.windowStartedAt + this.policy.windowMs, now) };
  }

  registerAttempt(emailKey: string, ip: string, now = Date.now()): RateLimitAssessment {
    const current = this.assess(emailKey, ip, now);
    if (!current.allowed) return current;

    let record = this.records.get(emailKey);
    if (!record) {
      this.pruneIfNeeded();
      record = { ips: new Map(), windowStartedAt: now, lastSeenAt: now };
      this.records.set(emailKey, record);
    }
    record.ips.set(ip, now);
    record.lastSeenAt = now;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(emailKey: string) {
    this.records.delete(emailKey);
  }

  private pruneIfNeeded() {
    if (this.records.size < this.policy.maxEntries) return;
    let oldestKey: string | undefined;
    let oldestSeenAt = Number.POSITIVE_INFINITY;
    for (const [key, record] of this.records) {
      if (record.lastSeenAt < oldestSeenAt) {
        oldestKey = key;
        oldestSeenAt = record.lastSeenAt;
      }
    }
    if (oldestKey) this.records.delete(oldestKey);
  }
}

export function getClientIp(request: Request) {
  if (process.env.TRUST_PROXY_HEADERS !== 'true') return 'direct-connection';
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase();
}

export type RequestRateLimitAttempt = {
  assess: () => RateLimitAssessment;
  registerFailure: () => RateLimitAssessment;
  succeed: () => void;
};

const authenticationRateLimiter = new InMemoryRateLimiter();
const distinctIpPerEmailLimiter = new DistinctIpPerEmailLimiter();

export function createRequestRateLimitAttempt(input: { scope: 'login' | 'register' | 'invite-accept'; request: Request; email?: string }): RequestRateLimitAttempt {
  const email = normalizeEmail(input.email);
  const ip = getClientIp(input.request);
  const keys = Array.from(new Set([
    `${input.scope}:ip:${ip}`,
    ...(email ? [`${input.scope}:email:${email}`] : [])
  ]));
  const emailKey = email ? `${input.scope}:email:${email}` : undefined;

  function combine(assessments: RateLimitAssessment[]) {
    const retryAfter = Math.max(0, ...assessments.map((assessment) => assessment.retryAfterSeconds));
    return { allowed: assessments.every((assessment) => assessment.allowed), retryAfterSeconds: retryAfter };
  }

  return {
    assess: () => combine([
      ...keys.map((key) => authenticationRateLimiter.assess(key)),
      ...(emailKey ? [distinctIpPerEmailLimiter.assess(emailKey, ip)] : [])
    ]),
    registerFailure: () => combine([
      ...keys.map((key) => authenticationRateLimiter.registerFailure(key)),
      ...(emailKey ? [distinctIpPerEmailLimiter.registerAttempt(emailKey, ip)] : [])
    ]),
    succeed: () => {
      keys.forEach((key) => authenticationRateLimiter.clear(key));
      if (emailKey) distinctIpPerEmailLimiter.clear(emailKey);
    }
  };
}

export function rateLimitHeaders(retryAfter: number): HeadersInit {
  return {
    'Cache-Control': 'no-store',
    'Retry-After': String(retryAfter)
  };
}

export function rateLimitMessage(retryAfter: number) {
  return `Muitas tentativas. Aguarde cerca de ${retryAfter} segundo(s) antes de tentar novamente.`;
}
