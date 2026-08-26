import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.RUN_DB_TESTS !== '1') {
    throw new Error('Defina RUN_DB_TESTS=1 para executar o round-trip contra um banco de teste.');
  }
  const ownerId = process.env.DEMO_OWNER_ID ?? 'test-owner';
  const { exportCampaignAsOwner, importCampaign } = await import('../src/services/campaignTransferService');
  const existingUser = await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true } });

  await prisma.user.upsert({
    where: { id: ownerId },
    update: {},
    create: { id: ownerId, name: 'Teste de integração', email: `${ownerId}@rpgcampaignstudio.local` }
  });

  let originalId: string | undefined;
  let importedId: string | undefined;
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name: `Round-trip ${Date.now()}`,
        system: 'CUSTOM',
        ownerId,
        attributes: { create: [{ name: 'Coragem', shortLabel: 'COR', min: 0, max: 20, defaultVal: 5, order: 0 }] },
        classes: { create: [{ name: 'Investigador', description: 'Classe de teste' }] },
        races: { create: [{ name: 'Humano', description: 'Raça de teste' }] },
        playerModeConfig: { create: { isEnabled: false } }
      },
      include: { attributes: true, classes: true, races: true }
    });
    originalId = campaign.id;
    const skill = await prisma.campaignSkill.create({
      data: { campaignId: campaign.id, name: 'Percepção', linkedAttr: campaign.attributes[0]!.id, order: 0 }
    });
    const file = await prisma.campaignFile.create({
      data: {
        campaignId: campaign.id,
        type: 'CHARACTER',
        name: 'Personagem de integração',
        data: {
          classId: campaign.classes[0]!.id,
          raceId: campaign.races[0]!.id,
          attributes: { [campaign.attributes[0]!.id]: 12 },
          skills: { [skill.id]: true }
        },
        authorId: ownerId
      }
    });
    const exported = await exportCampaignAsOwner(campaign.id, ownerId);
    const imported = await importCampaign(ownerId, exported);
    importedId = imported.campaign.id;
    const reExported = await exportCampaignAsOwner(importedId, ownerId);
    const importedFile = reExported.files.find((item) => item.name === file.name);
    const originalData = file.data as { classId: string; raceId: string; attributes: Record<string, unknown>; skills: Record<string, unknown> };
    const importedData = importedFile?.data as typeof originalData | undefined;

    if (!importedFile || !importedData || importedData.classId === originalData.classId || importedData.raceId === originalData.raceId) {
      throw new Error('O round-trip não remapeou os IDs da ficha customizada.');
    }
    if (reExported.files.length !== exported.files.length || reExported.customSystem.attributes.length !== exported.customSystem.attributes.length) {
      throw new Error('O round-trip alterou as contagens do documento exportado.');
    }
    console.log(JSON.stringify({ ok: true, originalId, importedId, files: reExported.files.length }, null, 2));
  } finally {
    if (importedId) await prisma.campaign.delete({ where: { id: importedId } });
    if (originalId) await prisma.campaign.delete({ where: { id: originalId } });
    if (!existingUser) await prisma.user.delete({ where: { id: ownerId } }).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error('[test:db:roundtrip]', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
