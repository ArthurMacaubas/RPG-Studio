import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorResponse } from '@/lib/apiErrors';
import { registerUser } from '@/lib/auth';
import { createRequestRateLimitAttempt, rateLimitHeaders, rateLimitMessage } from '@/lib/requestRateLimit';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  let limiter: ReturnType<typeof createRequestRateLimitAttempt> | undefined;
  try {
    const parsed = schema.safeParse(await request.json());
    limiter = createRequestRateLimitAttempt({ scope: 'register', request, email: parsed.success ? parsed.data.email : undefined });
    const assessment = limiter.assess();
    if (!assessment.allowed) return NextResponse.json({ error: rateLimitMessage(assessment.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(assessment.retryAfterSeconds) });
    if (!parsed.success) {
      const failure = limiter.registerFailure();
      if (!failure.allowed) return NextResponse.json({ error: rateLimitMessage(failure.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(failure.retryAfterSeconds) });
      return NextResponse.json({ error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' }, { status: 400 });
    }
    const user = await registerUser(parsed.data);
    limiter.succeed();
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const status = (error as { status?: number } | undefined)?.status;
    if (limiter && status && status < 500) {
      const failure = limiter.registerFailure();
      if (!failure.allowed) return NextResponse.json({ error: rateLimitMessage(failure.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(failure.retryAfterSeconds) });
    }
    return apiErrorResponse(error, 'Não foi possível criar a conta.');
  }
}
