import type { CSSProperties } from 'react';
import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor hexadecimal com seis dígitos.');
const imageValue = z.string().max(850_000).refine(
  (value) => value === '' || value.startsWith('/') || /^data:image\/(?:png|jpeg|gif|webp);base64,[a-zA-Z0-9+/=]+$/.test(value),
  'Use uma imagem enviada pelo editor ou um caminho interno seguro.'
);

export const FONT_OPTIONS = ['Inter', 'Cinzel', 'Noto Serif JP', 'Space Grotesk', 'Georgia', 'System'] as const;

export const campaignThemeConfigSchema = z.object({
  version: z.literal(1),
  identity: z.object({
    logoUrl: imageValue,
    symbolUrl: imageValue,
    bannerUrl: imageValue,
    backgroundImageUrl: imageValue,
    faviconUrl: imageValue,
    subtitle: z.string().trim().max(120)
  }).strict(),
  colors: z.object({
    background: hexColor,
    backgroundSecondary: hexColor,
    surface: hexColor,
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    text: hexColor,
    textSecondary: hexColor,
    border: hexColor,
    links: hexColor,
    complementary: hexColor
  }).strict(),
  typography: z.object({
    headingFont: z.enum(FONT_OPTIONS),
    bodyFont: z.enum(FONT_OPTIONS),
    accentFont: z.enum(FONT_OPTIONS),
    weight: z.number().int().min(400).max(700)
  }).strict(),
  components: z.object({
    borderRadius: z.number().int().min(0).max(24),
    shadowIntensity: z.number().min(0).max(1),
    panelOpacity: z.number().min(0.55).max(1),
    texture: z.enum(['none', 'paper', 'ink', 'grain']),
    animationIntensity: z.number().min(0).max(1),
    dividerStyle: z.enum(['solid', 'dashed', 'ornamental'])
  }).strict(),
  preferences: z.object({
    mode: z.enum(['dark', 'light']),
    backgroundPosition: z.enum(['center', 'top', 'bottom']),
    backgroundOpacity: z.number().min(0).max(1),
    imageOverlay: hexColor,
    imageOverlayOpacity: z.number().min(0).max(1),
    decorativeElements: z.boolean()
  }).strict()
}).strict();

export type CampaignThemeConfig = z.infer<typeof campaignThemeConfigSchema>;

export const DEFAULT_CAMPAIGN_THEME: CampaignThemeConfig = {
  version: 1,
  identity: { logoUrl: '', symbolUrl: '', bannerUrl: '', backgroundImageUrl: '', faviconUrl: '', subtitle: '' },
  colors: {
    background: '#0B1012', backgroundSecondary: '#070A0C', surface: '#121A1D', primary: '#C8A66A',
    secondary: '#86AAA2', accent: '#DFC282', text: '#EDF3EE', textSecondary: '#A8B9B4',
    border: '#2A393D', links: '#C8A66A', complementary: '#263438'
  },
  typography: { headingFont: 'Space Grotesk', bodyFont: 'Inter', accentFont: 'Georgia', weight: 500 },
  components: { borderRadius: 10, shadowIntensity: 0.55, panelOpacity: 1, texture: 'none', animationIntensity: 1, dividerStyle: 'solid' },
  preferences: { mode: 'dark', backgroundPosition: 'center', backgroundOpacity: 0.22, imageOverlay: '#0B1012', imageOverlayOpacity: 0.72, decorativeElements: true }
};

export const MEDIEVAL_FANTASY_THEME: CampaignThemeConfig = {
  version: 1,
  identity: { logoUrl: '', symbolUrl: '', bannerUrl: '', backgroundImageUrl: '', faviconUrl: '', subtitle: 'Grimório das Terras Antigas' },
  colors: {
    background: '#181610', backgroundSecondary: '#211E17', surface: '#2D281F', primary: '#79613B',
    secondary: '#48543A', accent: '#C6A66B', text: '#F0E5CF', textSecondary: '#B1A38B',
    border: '#4A4030', links: '#D4B77C', complementary: '#352F23'
  },
  typography: { headingFont: 'Cinzel', bodyFont: 'Georgia', accentFont: 'Cinzel', weight: 500 },
  components: { borderRadius: 6, shadowIntensity: 0.4, panelOpacity: 0.96, texture: 'paper', animationIntensity: 0.5, dividerStyle: 'ornamental' },
  preferences: { mode: 'dark', backgroundPosition: 'center', backgroundOpacity: 0.16, imageOverlay: '#181610', imageOverlayOpacity: 0.78, decorativeElements: true }
};

export const CYBERPUNK_THEME: CampaignThemeConfig = {
  version: 1,
  identity: { logoUrl: '', symbolUrl: '', bannerUrl: '', backgroundImageUrl: '', faviconUrl: '', subtitle: 'Nó clandestino · Acesso restrito' },
  colors: {
    background: '#080C12', backgroundSecondary: '#0F1621', surface: '#172230', primary: '#00B8C8',
    secondary: '#A92E68', accent: '#F2C94C', text: '#E0EDF5', textSecondary: '#8295A8',
    border: '#29394B', links: '#42D9E8', complementary: '#1B2B3D'
  },
  typography: { headingFont: 'Cinzel', bodyFont: 'Inter', accentFont: 'Noto Serif JP', weight: 500 },
  components: { borderRadius: 2, shadowIntensity: 0.45, panelOpacity: 0.94, texture: 'grain', animationIntensity: 0.7, dividerStyle: 'dashed' },
  preferences: { mode: 'dark', backgroundPosition: 'center', backgroundOpacity: 0.14, imageOverlay: '#080C12', imageOverlayOpacity: 0.72, decorativeElements: true }
};

export interface OfficialThemePreset {
  id: string;
  name: string;
  description: string;
  official: true;
  config: CampaignThemeConfig;
}

export const OFFICIAL_THEME_PRESETS: readonly OfficialThemePreset[] = [
  { id: 'official-default', name: 'RPG Studio', description: 'Tema padrão da plataforma', official: true, config: DEFAULT_CAMPAIGN_THEME },
  { id: 'official-medieval-fantasy', name: 'Medieval Fantasy', description: 'Fantasia medieval e cartográfica', official: true, config: MEDIEVAL_FANTASY_THEME },
  { id: 'official-cyberpunk', name: 'Cyberpunk', description: 'Distopia futurista clandestina', official: true, config: CYBERPUNK_THEME }
];

const FONT_STACKS: Record<(typeof FONT_OPTIONS)[number], string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  Cinzel: "'Cinzel', 'Times New Roman', serif",
  'Noto Serif JP': "'Noto Serif JP', 'Yu Mincho', serif",
  'Space Grotesk': "'Space Grotesk', 'Inter', sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  System: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
};

function rgba(hex: string, alpha: number) {
  const value = hex.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
}

export type CampaignThemeStyle = CSSProperties & Record<`--${string}`, string | number>;

export function themeConfigToStyle(config: CampaignThemeConfig): CampaignThemeStyle {
  const radius = config.components.borderRadius;
  const animation = Math.round(180 * config.components.animationIntensity);
  const shadow = config.components.shadowIntensity;
  return {
    '--color-background': config.colors.background,
    '--color-canvas': config.colors.background,
    '--color-canvas-deep': config.colors.backgroundSecondary,
    '--color-surface': rgba(config.colors.surface, config.components.panelOpacity),
    '--color-surface-elevated': config.colors.backgroundSecondary,
    '--color-surface-raised': config.colors.backgroundSecondary,
    '--color-surface-hover': config.colors.complementary,
    '--color-surface-active': config.colors.secondary,
    '--color-border-subtle': rgba(config.colors.border, 0.5),
    '--color-border': config.colors.border,
    '--color-border-strong': config.colors.accent,
    '--color-text-primary': config.colors.text,
    '--color-text': config.colors.text,
    '--color-text-secondary': config.colors.textSecondary,
    '--color-text-muted': config.colors.textSecondary,
    '--color-text-faint': rgba(config.colors.textSecondary, 0.76),
    '--color-accent': config.colors.primary,
    '--color-accent-hover': config.colors.accent,
    '--color-accent-muted': rgba(config.colors.primary, 0.17),
    '--color-accent-secondary': config.colors.secondary,
    '--color-accent-secondary-muted': rgba(config.colors.secondary, 0.2),
    '--color-link': config.colors.links,
    '--font-display': FONT_STACKS[config.typography.headingFont],
    '--font-body': FONT_STACKS[config.typography.bodyFont],
    '--font-accent': FONT_STACKS[config.typography.accentFont],
    '--font-weight-regular': String(config.typography.weight),
    '--radius-sm': `${Math.max(0, Math.round(radius * 0.6))}px`,
    '--radius-md': `${radius}px`,
    '--radius-lg': `${Math.round(radius * 1.6)}px`,
    '--radius-xl': `${Math.round(radius * 2.2)}px`,
    '--shadow-panel': `0 1px 0 ${rgba(config.colors.text, 0.025)}, 0 ${Math.round(8 + shadow * 12)}px ${Math.round(18 + shadow * 28)}px rgba(0, 0, 0, ${(0.08 + shadow * 0.3).toFixed(2)})`,
    '--shadow-float': `0 ${Math.round(16 + shadow * 14)}px ${Math.round(36 + shadow * 42)}px rgba(0, 0, 0, ${(0.16 + shadow * 0.42).toFixed(2)})`,
    '--transition-fast': `${Math.max(1, Math.round(animation * 0.78))}ms var(--ease-out)`,
    '--transition-base': `${Math.max(1, animation)}ms var(--ease-out)`,
    '--campaign-background-image': config.identity.backgroundImageUrl ? `url("${config.identity.backgroundImageUrl}")` : 'none',
    '--campaign-background-position': config.preferences.backgroundPosition,
    '--campaign-background-opacity': String(config.preferences.backgroundOpacity),
    '--campaign-overlay': rgba(config.preferences.imageOverlay, config.preferences.imageOverlayOpacity),
    '--campaign-divider-style': config.components.dividerStyle === 'dashed' ? 'dashed' : 'solid',
    '--campaign-decoration-opacity': config.preferences.decorativeElements ? '1' : '0',
    colorScheme: config.preferences.mode
  };
}

export function parseThemeConfig(value: unknown) {
  return campaignThemeConfigSchema.parse(value);
}
