import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ConstraintCase = 'from' | 'to' | 'duplicate';
type PrismaLikeError = { code?: unknown; meta?: Record<string, unknown> };

function prismaCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as PrismaLikeError).code
    : undefined;
}

function isPrismaErrorCode(error: unknown, code: string) {
  return prismaCode(error) === code;
}

function sanitizeDiagnosticValue(value: unknown) {
  if (typeof value !== 'string') return null;
  const sanitized = value.replace(/[^a-zA-Z0-9_.() -]/g, '').slice(0, 160);
  return sanitized || null;
}

function optionalConstraintDiagnostic(error: unknown) {
  if (typeof error !== 'object' || error === null || !('meta' in error)) return null;
  const meta = (error as PrismaLikeError).meta;
  if (!meta) return null;
  const entries = ['field_name', 'target', 'constraint']
    .map((key) => [key, sanitizeDiagnosticValue(meta[key])] as const)
    .filter(([, value]) => value !== null);
  return entries.length ? Object.fromEntries(entries) : null;
}

function diagnosticText(error: unknown) {
  const code = prismaCode(error);
  const diagnostic = optionalConstraintDiagnostic(error);
  return `code=${typeof code === 'string' ? code : 'unknown'} diagnostic=${diagnostic ? JSON.stringify(diagnostic) : 'unavailable'}`;
}

function diagnosticMatchesForeignKeyCase(error: unknown, kind: Exclude<ConstraintCase, 'duplicate'>) {
  const meta = typeof error === 'object' && error !== null && 'meta' in error
    ? (error as PrismaLikeError).meta
    : undefined;
  const fieldName = typeof meta?.field_name === 'string' ? meta.field_name : null;
  if (!fieldName) return true;

  const tokens = fieldName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
  const expected = kind === 'from' ? ['from', 'source', 'origem'] : ['to', 'target', 'destino'];
  const opposite = kind === 'from' ? ['to', 'target', 'destino'] : ['from', 'source', 'origem'];
  const hasExpected = expected.some((token) => tokens.includes(token) || tokens.includes(`${token}id`));
  const hasOpposite = opposite.some((token) => tokens.includes(token) || tokens.includes(`${token}id`));

  return hasExpected || !hasOpposite;
}

async function expectConstraintViolation(action: () => Promise<unknown>, kind: ConstraintCase) {
  try {
    await action();
    throw new Error(`${kind} cross-campaign não acionou a constraint estrutural esperada; code=none diagnostic=none`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('não acionou a constraint estrutural')) throw error;

    const expectedCode = kind === 'duplicate' ? 'P2002' : 'P2003';
    if (!isPrismaErrorCode(error, expectedCode)) {
      throw new Error(`${kind} cross-campaign recebeu código inesperado; esperado=${expectedCode} ${diagnosticText(error)}`);
    }
    if (kind !== 'duplicate' && !diagnosticMatchesForeignKeyCase(error, kind)) {
      throw new Error(`${kind} cross-campaign indicou FK de outra operação; ${diagnosticText(error)}`);
    }
  }
}

async function main() {
  if (process.env.RUN_DB_TESTS !== '1' || process.env.INTEGRATION_TEST_DATABASE !== '1') {
    throw new Error('Defina RUN_DB_TESTS=1 e INTEGRATION_TEST_DATABASE=1 para autorizar escritas temporárias no banco de teste.');
  }

  const suffix = `m3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ownerId = `relationship-cross-campaign-owner-${suffix}`;
  const campaignIds: string[] = [];

  try {
    await prisma.user.create({
      data: { id: ownerId, name: 'Teste M3', email: `${ownerId}@rpgcampaignstudio.local` }
    });
    const globalType = await prisma.relationshipType.findFirst({
      where: { campaignId: null, key: 'GENERIC' },
      select: { id: true }
    });
    if (!globalType) throw new Error('O tipo global GENERIC não está disponível para o teste M3.');

    const [campaignA, campaignB] = await Promise.all([
      prisma.campaign.create({ data: { name: `M3 A ${suffix}`, system: 'CUSTOM', ownerId } }),
      prisma.campaign.create({ data: { name: `M3 B ${suffix}`, system: 'CUSTOM', ownerId } })
    ]);
    campaignIds.push(campaignA.id, campaignB.id);

    const [fromA, toA, fromB, toB] = await Promise.all([
      prisma.campaignFile.create({ data: { campaignId: campaignA.id, type: 'CLUE', name: `A origem ${suffix}` } }),
      prisma.campaignFile.create({ data: { campaignId: campaignA.id, type: 'NPC', name: `A destino ${suffix}` } }),
      prisma.campaignFile.create({ data: { campaignId: campaignB.id, type: 'CLUE', name: `B origem ${suffix}` } }),
      prisma.campaignFile.create({ data: { campaignId: campaignB.id, type: 'NPC', name: `B destino ${suffix}` } })
    ]);

    const valid = await prisma.relationship.create({
      data: { campaignId: campaignA.id, fromId: fromA.id, toId: toA.id, typeId: globalType.id, kind: 'GENERIC' }
    });

    await expectConstraintViolation(
      () => prisma.relationship.create({ data: { campaignId: campaignA.id, fromId: fromB.id, toId: toA.id, typeId: globalType.id, kind: 'GENERIC' } }),
      'from'
    );
    await expectConstraintViolation(
      () => prisma.relationship.create({ data: { campaignId: campaignA.id, fromId: fromA.id, toId: toB.id, typeId: globalType.id, kind: 'GENERIC' } }),
      'to'
    );
    await expectConstraintViolation(
      () => prisma.relationship.create({ data: { campaignId: campaignA.id, fromId: fromA.id, toId: toA.id, typeId: globalType.id, kind: 'GENERIC' } }),
      'duplicate'
    );

    const validCount = await prisma.relationship.count({ where: { id: valid.id } });
    if (validCount !== 1) throw new Error('A relação válida não permaneceu disponível durante o teste.');

    console.log(JSON.stringify({
      ok: true,
      validSameCampaign: true,
      fromCrossCampaign: true,
      toCrossCampaign: true,
      duplicate: true,
      cleanupScope: 'temporary-campaigns-and-user-only'
    }));
  } finally {
    for (const campaignId of campaignIds) {
      await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => undefined);
    }
    await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(`[relationship-cross-campaign-db] ${error instanceof Error ? error.message : diagnosticText(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
