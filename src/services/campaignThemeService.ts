import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AccessDeniedError, assertOwnedCampaignForWrite, assertCampaignRole } from '@/lib/access';
import {
  DEFAULT_CAMPAIGN_THEME,
  OFFICIAL_THEME_PRESETS,
  campaignThemeConfigSchema,
  parseThemeConfig,
  type CampaignThemeConfig
} from '@/lib/campaignTheme';

function asJson(config: CampaignThemeConfig) {
  return config as unknown as Prisma.InputJsonValue;
}

async function ownedTheme(campaignId: string, themeId: string) {
  const theme = await prisma.campaignTheme.findFirst({ where: { id: themeId, campaignId } });
  if (!theme) throw new AccessDeniedError('Tema não encontrado.', 404);
  return theme;
}

export const campaignThemeService = {
  async publishedForCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        activeTheme: { select: { id: true, name: true, publishedConfig: true, publishedAt: true } }
      }
    });
    const active = campaign?.activeTheme;
    if (!active?.publishedConfig) return null;
    const parsed = campaignThemeConfigSchema.safeParse(active.publishedConfig);
    if (!parsed.success) return null;
    return { id: active.id, name: active.name, config: parsed.data, publishedAt: active.publishedAt };
  },

  async list(campaignId: string) {
    const access = await assertCampaignRole(campaignId, 'OWNER');
    const [campaign, themes, presets] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId }, select: { activeThemeId: true } }),
      prisma.campaignTheme.findMany({ where: { campaignId }, orderBy: { updatedAt: 'desc' } }),
      prisma.themePreset.findMany({ where: { ownerId: access.user.id }, orderBy: { updatedAt: 'desc' } })
    ]);
    return {
      activeThemeId: campaign?.activeThemeId ?? null,
      themes,
      presets: [
        ...OFFICIAL_THEME_PRESETS,
        ...presets.map((preset) => ({ id: preset.id, name: preset.name, official: false, config: preset.config }))
      ]
    };
  },

  async create(campaignId: string, input: { name: string; config?: unknown; presetId?: string }) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    let config = input.config ? parseThemeConfig(input.config) : DEFAULT_CAMPAIGN_THEME;
    if (input.presetId) {
      const official = OFFICIAL_THEME_PRESETS.find((preset) => preset.id === input.presetId);
      if (official) config = official.config;
      else {
        const preset = await prisma.themePreset.findFirst({ where: { id: input.presetId, ownerId: campaign.ownerId } });
        if (!preset) throw new AccessDeniedError('Predefinição não encontrada.', 404);
        config = parseThemeConfig(preset.config);
      }
    }
    const theme = await prisma.campaignTheme.create({
      data: { campaignId, createdById: campaign.ownerId, name: input.name, draftConfig: asJson(config) }
    });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.created', entityType: 'CampaignTheme', entityId: theme.id, metadata: { name: theme.name } } });
    return theme;
  },

  async updateDraft(campaignId: string, themeId: string, input: { name?: string; config?: unknown }) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    await ownedTheme(campaignId, themeId);
    const config = input.config === undefined ? undefined : asJson(parseThemeConfig(input.config));
    const theme = await prisma.campaignTheme.update({
      where: { id: themeId },
      data: { name: input.name, draftConfig: config }
    });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.draft.updated', entityType: 'CampaignTheme', entityId: themeId } });
    return theme;
  },

  async duplicate(campaignId: string, themeId: string, name: string) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    const source = await ownedTheme(campaignId, themeId);
    const theme = await prisma.campaignTheme.create({
      data: { campaignId, createdById: campaign.ownerId, name, draftConfig: source.draftConfig as Prisma.InputJsonValue }
    });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.duplicated', entityType: 'CampaignTheme', entityId: theme.id, metadata: { sourceThemeId: themeId } } });
    return theme;
  },

  async restoreDefault(campaignId: string, themeId: string) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    await ownedTheme(campaignId, themeId);
    const theme = await prisma.campaignTheme.update({ where: { id: themeId }, data: { draftConfig: asJson(DEFAULT_CAMPAIGN_THEME) } });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.draft.restored', entityType: 'CampaignTheme', entityId: themeId } });
    return theme;
  },

  async publish(campaignId: string, themeId: string) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    const theme = await ownedTheme(campaignId, themeId);
    const config = parseThemeConfig(theme.draftConfig);
    const published = await prisma.campaignTheme.update({
      where: { id: themeId },
      data: { publishedConfig: asJson(config), publishedAt: new Date() }
    });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.published', entityType: 'CampaignTheme', entityId: themeId } });
    return published;
  },

  async apply(campaignId: string, themeId: string) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    const theme = await ownedTheme(campaignId, themeId);
    if (!theme.publishedConfig) throw new AccessDeniedError('Publique o tema antes de aplicá-lo.', 409);
    parseThemeConfig(theme.publishedConfig);
    await prisma.$transaction([
      prisma.campaign.update({ where: { id: campaignId }, data: { activeThemeId: themeId } }),
      prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.applied', entityType: 'CampaignTheme', entityId: themeId } })
    ]);
    return { activeThemeId: themeId };
  },

  async savePreset(campaignId: string, themeId: string, name: string) {
    const campaign = await assertOwnedCampaignForWrite(campaignId);
    const theme = await ownedTheme(campaignId, themeId);
    const config = parseThemeConfig(theme.draftConfig);
    const preset = await prisma.themePreset.create({ data: { ownerId: campaign.ownerId, name, config: asJson(config) } });
    await prisma.auditEvent.create({ data: { campaignId, actorId: campaign.ownerId, action: 'theme.preset.saved', entityType: 'ThemePreset', entityId: preset.id, metadata: { sourceThemeId: themeId } } });
    return preset;
  }
};
