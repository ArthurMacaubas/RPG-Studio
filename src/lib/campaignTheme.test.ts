import { describe, expect, it } from 'vitest';
import { CYBERPUNK_THEME, DEFAULT_CAMPAIGN_THEME, MEDIEVAL_FANTASY_THEME, OFFICIAL_THEME_PRESETS, campaignThemeConfigSchema, themeConfigToStyle } from './campaignTheme';

describe('campaign theme configuration', () => {
  it('rejeita CSS, JavaScript e URLs externas nos campos de imagem', () => {
    for (const value of ['javascript:alert(1)', 'https://example.com/image.png', 'data:image/svg+xml;base64,PHN2Zz4=']) {
      expect(campaignThemeConfigSchema.safeParse({ ...DEFAULT_CAMPAIGN_THEME, identity: { ...DEFAULT_CAMPAIGN_THEME.identity, logoUrl: value } }).success).toBe(false);
    }
  });

  it('gera tokens distintos e isoláveis para duas campanhas', () => {
    const defaultStyle = themeConfigToStyle(DEFAULT_CAMPAIGN_THEME);
    expect(defaultStyle['--color-background']).toBe('#0B1012');
    expect(defaultStyle['--font-display']).toContain('Space Grotesk');
    expect(themeConfigToStyle(DEFAULT_CAMPAIGN_THEME)).toEqual(defaultStyle);
  });

  it('expõe o catálogo genérico com temas válidos e tokens distintos', () => {
    expect(OFFICIAL_THEME_PRESETS.map((preset) => preset.name)).toEqual(['RPG Studio', 'Medieval Fantasy', 'Cyberpunk']);
    for (const preset of OFFICIAL_THEME_PRESETS) expect(campaignThemeConfigSchema.parse(preset.config)).toEqual(preset.config);
    expect(MEDIEVAL_FANTASY_THEME.colors.background).toBe('#181610');
    expect(CYBERPUNK_THEME.colors.primary).toBe('#00B8C8');
    expect(themeConfigToStyle(MEDIEVAL_FANTASY_THEME)['--color-background']).not.toBe(themeConfigToStyle(CYBERPUNK_THEME)['--color-background']);
  });
});
