import { describe, expect, it } from 'vitest';
import { ARASHI_THEME, CYBERPUNK_THEME, DEFAULT_CAMPAIGN_THEME, MEDIEVAL_FANTASY_THEME, OFFICIAL_THEME_PRESETS, campaignThemeConfigSchema, themeConfigToStyle } from './campaignTheme';

describe('campaign theme configuration', () => {
  it('mantém completa e válida a predefinição O Sangue de Arashi', () => {
    expect(campaignThemeConfigSchema.parse(ARASHI_THEME)).toEqual(ARASHI_THEME);
    expect(ARASHI_THEME.identity.subtitle).toBe('Arquivos da Ordem Branca');
    expect(ARASHI_THEME.modes.dark.colors.primary).toBe('#8C2429');
    expect(ARASHI_THEME.modes.light.colors.primary).toBe('#8C2429');
    expect(ARASHI_THEME.typography).toMatchObject({ headingFont: 'Cinzel', bodyFont: 'Inter', accentFont: 'Noto Serif JP' });
  });

  it('rejeita CSS, JavaScript e URLs externas nos campos de imagem', () => {
    for (const value of ['javascript:alert(1)', 'https://example.com/image.png', 'data:image/svg+xml;base64,PHN2Zz4=']) {
      expect(campaignThemeConfigSchema.safeParse({ ...DEFAULT_CAMPAIGN_THEME, identity: { ...DEFAULT_CAMPAIGN_THEME.identity, logoUrl: value } }).success).toBe(false);
    }
  });

  it('gera tokens distintos e isoláveis para duas campanhas', () => {
    const defaultStyle = themeConfigToStyle(DEFAULT_CAMPAIGN_THEME);
    const arashiStyle = themeConfigToStyle(ARASHI_THEME);
    expect(defaultStyle['--color-background']).toBe('#0B1012');
    expect(arashiStyle['--color-background']).toBe('#0D0D0F');
    expect(arashiStyle['--font-display']).toContain('Cinzel');
    expect(defaultStyle).not.toEqual(arashiStyle);
  });

  it('gera tokens correspondentes para os dois modos do mesmo tema', () => {
    expect(themeConfigToStyle(ARASHI_THEME, 'dark')['--color-background']).toBe('#0D0D0F');
    expect(themeConfigToStyle(ARASHI_THEME, 'light')['--color-background']).toBe('#F3F4EF');
    expect(themeConfigToStyle(ARASHI_THEME, 'dark')['--color-background']).not.toBe(themeConfigToStyle(ARASHI_THEME, 'light')['--color-background']);
  });

  it('migra configurações v1 para variantes claro e escuro', () => {
    const legacy = {
      version: 1 as const,
      identity: DEFAULT_CAMPAIGN_THEME.identity,
      colors: DEFAULT_CAMPAIGN_THEME.modes.dark.colors,
      typography: DEFAULT_CAMPAIGN_THEME.typography,
      components: DEFAULT_CAMPAIGN_THEME.components,
      preferences: { mode: 'dark' as const, backgroundPosition: 'center' as const, backgroundOpacity: 0.22, imageOverlay: '#0B1012', imageOverlayOpacity: 0.72, decorativeElements: true }
    };
    const migrated = campaignThemeConfigSchema.parse(legacy);
    expect(migrated.version).toBe(2);
    expect(migrated.modes.dark.colors).toEqual(legacy.colors);
    expect(migrated.modes.light.colors.background).toBe('#F3F4EF');
  });

  it('expõe o catálogo nativo completo com temas válidos e tokens distintos', () => {
    expect(OFFICIAL_THEME_PRESETS.map((preset) => preset.name)).toEqual(['RPG Studio', 'O Sangue de Arashi', 'Medieval Fantasy', 'Cyberpunk']);
    for (const preset of OFFICIAL_THEME_PRESETS) expect(campaignThemeConfigSchema.parse(preset.config)).toEqual(preset.config);
    expect(MEDIEVAL_FANTASY_THEME.modes.dark.colors.background).toBe('#181610');
    expect(CYBERPUNK_THEME.modes.dark.colors.primary).toBe('#00B8C8');
    expect(themeConfigToStyle(MEDIEVAL_FANTASY_THEME)['--color-background']).not.toBe(themeConfigToStyle(CYBERPUNK_THEME)['--color-background']);
  });
});
