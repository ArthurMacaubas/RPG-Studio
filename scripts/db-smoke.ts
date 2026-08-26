import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurada.');
  }

  await prisma.$queryRaw`SELECT 1`;
  const [campaigns, files] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaignFile.count()
  ]);
  console.log(JSON.stringify({ ok: true, campaigns, files }, null, 2));
}

main()
  .catch((error) => {
    console.error('[db:smoke] Falha de conexão ou schema:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
