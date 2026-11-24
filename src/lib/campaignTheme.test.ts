import { describe, expect, it } from 'vitest';
import { ARASHI_THEME, CYBERPUNK_THEME, DEFAULT_CAMPAIGN_THEME, MEDIEVAL_FANTASY_THEME, OFFICIAL_THEME_PRESETS, campaignThemeConfigSchema, themeConfigToStyle } from './campaignTheme';

describe('campaign theme configuration', () => {
  it('mantém completa e válida a predefinição O Sangue de Arashi', () => {
    expect(campaignThemeConfigSchema.parse(ARASHI_THEME)).toEqual(ARASHI_THEME);
    expect(ARASHI_THEME.identity.subtitle).toBe('Arquivos da Ordem Branca');
    expect(ARASHI_THEME.colors.primary).toBe('#8C2429');
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

  it('expõe o catálogo nativo completo com temas válidos e tokens distintos', () => {
    expect(OFFICIAL_THEME_PRESETS.map((preset) => preset.name)).toEqual(['RPG Studio', 'O Sangue de Arashi', 'Medieval Fantasy', 'Cyberpunk']);
    for (const preset of OFFICIAL_THEME_PRESETS) expect(campaignThemeConfigSchema.parse(preset.config)).toEqual(preset.config);
    expect(MEDIEVAL_FANTASY_THEME.colors.background).toBe('#181610');
    expect(CYBERPUNK_THEME.colors.primary).toBe('#00B8C8');
    expect(themeConfigToStyle(MEDIEVAL_FANTASY_THEME)['--color-background']).not.toBe(themeConfigToStyle(CYBERPUNK_THEME)['--color-background']);
  });
});
