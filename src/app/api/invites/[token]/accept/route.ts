import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { getCurrentUser } from '@/lib/auth';
import { createRequestRateLimitAttempt, rateLimitHeaders, rateLimitMessage } from '@/lib/requestRateLimit';
import { campaignInviteService } from '@/services/campaignInviteService';

export async function POST(request: Request, { params }: { params: { token: string } }) {
  const currentUser = await getCurrentUser().catch(() => null);
  const limiter = createRequestRateLimitAttempt({ scope: 'invite-accept', request, email: currentUser?.email });
  const assessment = limiter.assess();
  if (!assessment.allowed) return NextResponse.json({ error: rateLimitMessage(assessment.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(assessment.retryAfterSeconds) });
  try {
    const result = await campaignInviteService.accept(params.token);
    limiter.succeed();
    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number } | undefined)?.status;
    if (status && status < 500) {
      const failure = limiter.registerFailure();
      if (!failure.allowed) return NextResponse.json({ error: rateLimitMessage(failure.retryAfterSeconds) }, { status: 429, headers: rateLimitHeaders(failure.retryAfterSeconds) });
    }
    return apiErrorResponse(error, 'Não foi possível aceitar este convite.');
  }
}
