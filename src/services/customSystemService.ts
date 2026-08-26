import { prisma } from '@/lib/prisma';
import { assertCampaignAccess } from '@/lib/access';

// Backs the "Sistema Personalizado" builder in Configurações. Only
// meaningful for campaigns with system = CUSTOM, but nothing here enforces
// that — a GM who switches a campaign's system keeps whatever they already
// configured, in case they switch back.

function normalizedName(value: string, entity: string) {
  const name = value.trim();
  if (!name) throw Object.assign(new Error(`Informe o nome da ${entity}.`), { status: 422 });
  return name;
}

function validateAttributeValues(values: { min: number; max: number; defaultVal: number }) {
  if (![values.min, values.max, values.defaultVal].every(Number.isInteger)) {
    throw Object.assign(new Error('Os valores do atributo precisam ser números inteiros.'), { status: 422 });
  }
  if (values.min > values.max) {
    throw Object.assign(new Error('O valor mínimo não pode ser maior que o valor máximo.'), { status: 422 });
  }
  if (values.defaultVal < values.min || values.defaultVal > values.max) {
    throw Object.assign(new Error('O valor padrão precisa estar entre o mínimo e o máximo.'), { status: 422 });
  }
}

async function assertUniqueName(model: 'campaignAttribute' | 'campaignSkill' | 'campaignClass' | 'campaignRace', campaignId: string, name: string, id?: string) {
  const where = { campaignId, name: { equals: name, mode: 'insensitive' as const }, ...(id ? { NOT: { id } } : {}) };
  const duplicate = model === 'campaignAttribute'
    ? await prisma.campaignAttribute.findFirst({ where, select: { id: true } })
    : model === 'campaignSkill'
      ? await prisma.campaignSkill.findFirst({ where, select: { id: true } })
      : model === 'campaignClass'
        ? await prisma.campaignClass.findFirst({ where, select: { id: true } })
        : await prisma.campaignRace.findFirst({ where, select: { id: true } });
  if (duplicate) throw Object.assign(new Error('Já existe uma configuração com este nome nesta campanha.'), { status: 409 });
}

async function assertLinkedAttribute(campaignId: string, linkedAttr?: string | null) {
  const normalized = linkedAttr?.trim();
  if (!normalized) return undefined;
  const attribute = await prisma.campaignAttribute.findFirst({ where: { id: normalized, campaignId }, select: { id: true } });
  if (!attribute) throw Object.assign(new Error('Atributo vinculado não pertence a esta campanha.'), { status: 422 });
  return attribute.id;
}

export const customSystemService = {
  // Attributes
  async listAttributes(campaignId: string) {
    await assertCampaignAccess(campaignId);
    return prisma.campaignAttribute.findMany({ where: { campaignId }, orderBy: { order: 'asc' } });
  },
  async createAttribute(campaignId: string, input: { name: string; shortLabel?: string; min?: number; max?: number; defaultVal?: number }) {
    await assertCampaignAccess(campaignId, { write: true });
    const name = normalizedName(input.name, 'atributo');
    const values = { min: input.min ?? 0, max: input.max ?? 100, defaultVal: input.defaultVal ?? 0 };
    validateAttributeValues(values);
    await assertUniqueName('campaignAttribute', campaignId, name);
    const count = await prisma.campaignAttribute.count({ where: { campaignId } });
    return prisma.campaignAttribute.create({
      data: {
        campaignId,
        name,
        shortLabel: input.shortLabel?.trim() || undefined,
        ...values,
        order: count
      }
    });
  },
  async updateAttribute(id: string, input: Partial<{ name: string; shortLabel: string; min: number; max: number; defaultVal: number }>) {
    const attribute = await prisma.campaignAttribute.findUnique({ where: { id }, select: { campaignId: true, name: true, min: true, max: true, defaultVal: true } });
    if (!attribute) throw Object.assign(new Error('Atributo não encontrado.'), { status: 404 });
    await assertCampaignAccess(attribute.campaignId, { write: true });
    const name = input.name === undefined ? attribute.name : normalizedName(input.name, 'atributo');
    const values = { min: input.min ?? attribute.min, max: input.max ?? attribute.max, defaultVal: input.defaultVal ?? attribute.defaultVal };
    validateAttributeValues(values);
    await assertUniqueName('campaignAttribute', attribute.campaignId, name, id);
    return prisma.campaignAttribute.update({ where: { id }, data: { ...input, name, shortLabel: input.shortLabel?.trim() || input.shortLabel, ...values } });
  },
  async removeAttribute(id: string) {
    const attribute = await prisma.campaignAttribute.findUnique({ where: { id }, select: { campaignId: true } });
    if (!attribute) throw Object.assign(new Error('Atributo não encontrado.'), { status: 404 });
    await assertCampaignAccess(attribute.campaignId, { write: true });
    return prisma.campaignAttribute.delete({ where: { id } });
  },

  // Skills
  async listSkills(campaignId: string) {
    await assertCampaignAccess(campaignId);
    return prisma.campaignSkill.findMany({ where: { campaignId }, orderBy: { order: 'asc' } });
  },
  async createSkill(campaignId: string, input: { name: string; linkedAttr?: string }) {
    await assertCampaignAccess(campaignId, { write: true });
    const name = normalizedName(input.name, 'perícia');
    const linkedAttr = await assertLinkedAttribute(campaignId, input.linkedAttr);
    await assertUniqueName('campaignSkill', campaignId, name);
    const count = await prisma.campaignSkill.count({ where: { campaignId } });
    return prisma.campaignSkill.create({
      data: { campaignId, name, linkedAttr, order: count }
    });
  },
  async removeSkill(id: string) {
    const skill = await prisma.campaignSkill.findUnique({ where: { id }, select: { campaignId: true } });
    if (!skill) throw Object.assign(new Error('Perícia não encontrada.'), { status: 404 });
    await assertCampaignAccess(skill.campaignId, { write: true });
    return prisma.campaignSkill.delete({ where: { id } });
  },

  // Classes
  async listClasses(campaignId: string) {
    await assertCampaignAccess(campaignId);
    return prisma.campaignClass.findMany({ where: { campaignId } });
  },
  async createClass(campaignId: string, input: { name: string; description?: string }) {
    await assertCampaignAccess(campaignId, { write: true });
    const name = normalizedName(input.name, 'classe');
    await assertUniqueName('campaignClass', campaignId, name);
    return prisma.campaignClass.create({ data: { campaignId, name, description: input.description?.trim() || undefined } });
  },
  async removeClass(id: string) {
    const item = await prisma.campaignClass.findUnique({ where: { id }, select: { campaignId: true } });
    if (!item) throw Object.assign(new Error('Classe não encontrada.'), { status: 404 });
    await assertCampaignAccess(item.campaignId, { write: true });
    return prisma.campaignClass.delete({ where: { id } });
  },

  // Races
  async listRaces(campaignId: string) {
    await assertCampaignAccess(campaignId);
    return prisma.campaignRace.findMany({ where: { campaignId } });
  },
  async createRace(campaignId: string, input: { name: string; description?: string }) {
    await assertCampaignAccess(campaignId, { write: true });
    const name = normalizedName(input.name, 'raça');
    await assertUniqueName('campaignRace', campaignId, name);
    return prisma.campaignRace.create({ data: { campaignId, name, description: input.description?.trim() || undefined } });
  },
  async removeRace(id: string) {
    const item = await prisma.campaignRace.findUnique({ where: { id }, select: { campaignId: true } });
    if (!item) throw Object.assign(new Error('Raça não encontrada.'), { status: 404 });
    await assertCampaignAccess(item.campaignId, { write: true });
    return prisma.campaignRace.delete({ where: { id } });
  }
};
