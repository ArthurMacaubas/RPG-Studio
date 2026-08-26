import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { loginUser } from '@/lib/auth';
import { createRequestRateLimitAttempt, rateLimitHeaders, rateLimitMessage } from '@/lib/requestRateLimit';

const schema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128)
});

export async function POST(request: Request) {
  let limiter: ReturnType<typeof createRequestRateLimitAttempt> | undefined;
  try {
    const parsed = schema.safeParse(await request.json());
    limiter = createRequestRateLimitAttempt({ scope: 'login', request, email: parsed.success ? parsed.data.email : undefined });
    const assessment = limiter.assess();
    if (!assessment.allowed) return NextResponse.json({ error: rateLimitMessage(assessment.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(assessment.retryAfterSeconds) });
    if (!parsed.success) {
      const failure = limiter.registerFailure();
      if (!failure.allowed) return NextResponse.json({ error: rateLimitMessage(failure.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(failure.retryAfterSeconds) });
      return NextResponse.json({ error: 'Informe um e-mail válido e sua senha.' }, { status: 400 });
    }
    const user = await loginUser(parsed.data.email, parsed.data.password);
    limiter.succeed();
    return NextResponse.json({ user });
  } catch (error) {
    const status = (error as { status?: number } | undefined)?.status;
    if (limiter && status && status < 500) {
      const failure = limiter.registerFailure();
      if (!failure.allowed) return NextResponse.json({ error: rateLimitMessage(failure.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(failure.retryAfterSeconds) });
    }
    return apiErrorResponse(error, 'Não foi possível entrar.');
  }
}
