'use client';
/* eslint-disable @next/next/no-img-element -- a prévia usa imagens validadas e persistidas no tema. */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Check, Copy, Download, Eye, ImagePlus, Palette, RotateCcw, Save, Sparkles, Upload } from 'lucide-react';
import { campaignThemesApi, type CampaignThemeRecord, type ThemePresetRecord } from '@/lib/api';
import {
  DEFAULT_CAMPAIGN_THEME,
  FONT_OPTIONS,
  campaignThemeConfigSchema,
  themeConfigToStyle,
  type CampaignThemeConfig
} from '@/lib/campaignTheme';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './AppearanceEditor.module.css';

const COLOR_FIELDS: Array<[keyof CampaignThemeConfig['colors'], string]> = [
  ['background', 'Fundo principal'], ['backgroundSecondary', 'Fundo secundário'], ['surface', 'Superfícies e cards'],
  ['primary', 'Cor primária'], ['secondary', 'Cor secundária'], ['accent', 'Destaque'], ['text', 'Texto principal'],
  ['textSecondary', 'Texto secundário'], ['border', 'Bordas'], ['links', 'Links'], ['complementary', 'Complementar']
];

const IMAGE_FIELDS: Array<[keyof CampaignThemeConfig['identity'], string]> = [
  ['logoUrl', 'Logotipo'], ['symbolUrl', 'Símbolo'], ['bannerUrl', 'Banner'], ['backgroundImageUrl', 'Imagem de fundo'], ['faviconUrl', 'Favicon contextual']
];

function cloneConfig(config: CampaignThemeConfig) {
  return JSON.parse(JSON.stringify(config)) as CampaignThemeConfig;
}

function ThemePreview({ config, name }: { config: CampaignThemeConfig; name: string }) {
  return (
    <div className={styles.preview} style={themeConfigToStyle(config)} data-texture={config.components.texture}>
      <div className={styles.previewBackdrop} />
      <aside className={styles.previewSidebar}>
        <div className={styles.previewBrand}>
          {config.identity.symbolUrl ? <img src={config.identity.symbolUrl} alt="" /> : <span />}
          <div><strong>{name || 'Minha campanha'}</strong><small>{config.identity.subtitle || 'Workspace de campanha'}</small></div>
        </div>
        {['Visão geral', 'Enciclopédia', 'Personagens', 'Mapas'].map((item, index) => <div key={item} className={index === 0 ? styles.previewNavActive : styles.previewNav}>{item}</div>)}
      </aside>
      <section className={styles.previewContent}>
        {config.identity.bannerUrl ? <img className={styles.previewBanner} src={config.identity.bannerUrl} alt="" /> : null}
        <small className={styles.previewEyebrow}>ARQUIVO DA CAMPANHA</small>
        <h2>{name || 'Identidade da campanha'}</h2>
        <p>Uma prévia isolada do tema. Jogadores continuam vendo apenas a versão publicada.</p>
        <div className={styles.previewCards}><article><small>SESSÕES</small><strong>12</strong></article><article><small>PERSONAGENS</small><strong>24</strong></article></div>
        <div className={styles.previewForm}><input value="Exemplo de formulário" readOnly /><button type="button">Ação primária</button></div>
      </section>
    </div>
  );
}

export function AppearanceEditor({ campaignId }: { campaignId: string }) {
  const [themes, setThemes] = useState<CampaignThemeRecord[]>([]);
  const [presets, setPresets] = useState<ThemePresetRecord[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [config, setConfig] = useState<CampaignThemeConfig>(() => cloneConfig(DEFAULT_CAMPAIGN_THEME));
  const [themeName, setThemeName] = useState('Novo tema');
  const [newThemeName, setNewThemeName] = useState('Novo tema');
  const [presetId, setPresetId] = useState('official-default');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const selectTheme = useCallback((theme: CampaignThemeRecord) => {
    setSelectedId(theme.id);
    setThemeName(theme.name);
    setConfig(cloneConfig(theme.draftConfig));
  }, []);

  const load = useCallback(async (preferredId?: string) => {
    const result = await campaignThemesApi.list(campaignId);
    setThemes(result.themes);
    setPresets(result.presets);
    setActiveThemeId(result.activeThemeId);
    const selected = result.themes.find((theme) => theme.id === preferredId) ?? result.themes[0];
    if (selected) selectTheme(selected);
    else setSelectedId(null);
  }, [campaignId, selectTheme]);

  useEffect(() => {
    setLoading(true);
    void load().catch((error) => toast({ tone: 'error', title: 'Falha ao carregar temas', message: error instanceof Error ? error.message : 'Tente novamente.' })).finally(() => setLoading(false));
  }, [load, toast]);

  function patchIdentity<K extends keyof CampaignThemeConfig['identity']>(key: K, value: CampaignThemeConfig['identity'][K]) {
    setConfig((current) => ({ ...current, identity: { ...current.identity, [key]: value } }));
  }

  function patchColor(key: keyof CampaignThemeConfig['colors'], value: string) {
    setConfig((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  }

  function patchTypography<K extends keyof CampaignThemeConfig['typography']>(key: K, value: CampaignThemeConfig['typography'][K]) {
    setConfig((current) => ({ ...current, typography: { ...current.typography, [key]: value } }));
  }

  function patchComponents<K extends keyof CampaignThemeConfig['components']>(key: K, value: CampaignThemeConfig['components'][K]) {
    setConfig((current) => ({ ...current, components: { ...current.components, [key]: value } }));
  }

  function patchPreferences<K extends keyof CampaignThemeConfig['preferences']>(key: K, value: CampaignThemeConfig['preferences'][K]) {
    setConfig((current) => ({ ...current, preferences: { ...current.preferences, [key]: value } }));
  }

  async function run(action: () => Promise<unknown>, success: string, preferredId?: string) {
    setBusy(true);
    try {
      const result = await action();
      const resultId = typeof result === 'object' && result && 'id' in result ? String(result.id) : preferredId;
      await load(resultId);
      toast({ tone: 'success', title: success });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível concluir', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setBusy(false);
    }
  }

  async function createTheme() {
    const name = newThemeName.trim();
    if (!name) return;
    await run(() => campaignThemesApi.create(campaignId, { name, presetId: presetId || undefined }), 'Tema criado');
  }

  async function saveDraft() {
    if (!selectedId) return;
    const parsed = campaignThemeConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast({ tone: 'error', title: 'Revise o tema', message: parsed.error.issues[0]?.message });
      return;
    }
    await run(() => campaignThemesApi.saveDraft(campaignId, selectedId, { name: themeName.trim(), config: parsed.data }), 'Rascunho salvo', selectedId);
  }

  async function themeAction(action: 'publish' | 'apply' | 'restore') {
    if (!selectedId) return;
    if (action === 'restore' && !window.confirm('Restaurar o rascunho para a identidade padrão do RPG Studio?')) return;
    const labels = { publish: 'Tema publicado', apply: 'Tema aplicado à campanha', restore: 'Padrão restaurado no rascunho' };
    await run(() => campaignThemesApi.action(campaignId, selectedId, { action }), labels[action], selectedId);
  }

  async function namedAction(action: 'duplicate' | 'savePreset') {
    if (!selectedId) return;
    const suggestion = action === 'duplicate' ? `${themeName} — cópia` : themeName;
    const name = window.prompt(action === 'duplicate' ? 'Nome da cópia' : 'Nome da predefinição', suggestion)?.trim();
    if (!name) return;
    await run(() => campaignThemesApi.action(campaignId, selectedId, { action, name }), action === 'duplicate' ? 'Tema duplicado' : 'Predefinição salva', selectedId);
  }

  async function uploadAsset(field: keyof CampaignThemeConfig['identity'], event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const result = await campaignThemesApi.uploadAsset(campaignId, file);
      patchIdentity(field, result.url);
      toast({ tone: 'success', title: 'Imagem adicionada ao rascunho', message: 'Salve o rascunho para persistir.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Falha no upload', message: error instanceof Error ? error.message : 'Use uma imagem otimizada de até 600 KB.' });
    } finally {
      setBusy(false);
    }
  }

  function exportTheme() {
    const payload = JSON.stringify({ format: 'rpg-campaign-theme', version: 1, name: themeName, config }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${themeName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'tema'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importTheme(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as { name?: unknown; config?: unknown };
      const imported = campaignThemeConfigSchema.parse(raw.config ?? raw);
      const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : file.name.replace(/\.json$/i, '').slice(0, 80);
      await run(() => campaignThemesApi.create(campaignId, { action: 'import', name, config: imported }), 'Tema importado');
    } catch (error) {
      toast({ tone: 'error', title: 'JSON de tema inválido', message: error instanceof Error ? error.message : 'Revise o arquivo.' });
    }
  }

  const selectedTheme = themes.find((theme) => theme.id === selectedId);
  if (loading) return <div className={styles.loading}>Carregando editor de aparência…</div>;

  return (
    <div className={styles.editor}>
      <section className={styles.library} aria-label="Temas da campanha">
        <div className={styles.sectionHeading}><div><span>Biblioteca</span><h2>Temas da campanha</h2></div><Palette size={19} /></div>
        <div className={styles.createRow}>
          <input value={newThemeName} onChange={(event) => setNewThemeName(event.target.value)} aria-label="Nome do novo tema" />
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)} aria-label="Predefinição inicial">
            <option value="">Padrão do Studio</option>
            {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.official ? 'Oficial · ' : ''}{preset.name}</option>)}
          </select>
          <button type="button" onClick={() => void createTheme()} disabled={busy || !newThemeName.trim()}><Sparkles size={14} />Criar tema</button>
        </div>
        <div className={styles.themeList}>
          {themes.length === 0 ? <p className={styles.empty}>Crie o primeiro tema da campanha a partir de uma predefinição.</p> : themes.map((theme) => (
            <button key={theme.id} type="button" className={`${styles.themeItem} ${theme.id === selectedId ? styles.themeItemSelected : ''}`} onClick={() => selectTheme(theme)}>
              <span className={styles.swatch} style={{ background: theme.draftConfig.colors.primary }} />
              <span><strong>{theme.name}</strong><small>{theme.publishedConfig ? 'Publicado' : 'Somente rascunho'}{activeThemeId === theme.id ? ' · ativo' : ''}</small></span>
              {activeThemeId === theme.id ? <Check size={15} /> : null}
            </button>
          ))}
        </div>
      </section>

      {selectedTheme ? <>
        <div className={styles.toolbar}>
          <input className={styles.themeName} value={themeName} onChange={(event) => setThemeName(event.target.value)} aria-label="Nome do tema" />
          <span className={styles.draftStatus}>{selectedTheme.publishedConfig ? 'Rascunho independente da versão publicada' : 'Ainda não publicado'}</span>
          <div className={styles.toolbarActions}>
            <button type="button" onClick={() => void namedAction('duplicate')} disabled={busy}><Copy size={14} />Duplicar</button>
            <button type="button" onClick={exportTheme}><Download size={14} />Exportar</button>
            <button type="button" onClick={() => importRef.current?.click()}><Upload size={14} />Importar</button>
            <input ref={importRef} className={styles.hiddenInput} type="file" accept="application/json,.json" onChange={importTheme} />
          </div>
        </div>

        <div className={styles.columns}>
          <div className={styles.controls}>
            <section className={styles.controlPanel}>
              <h3>Identidade</h3>
              <label>Subtítulo<input value={config.identity.subtitle} maxLength={120} onChange={(event) => patchIdentity('subtitle', event.target.value)} placeholder="Subtítulo da campanha" /></label>
              <div className={styles.imageGrid}>{IMAGE_FIELDS.map(([field, label]) => <div key={field} className={styles.imageControl}>
                <span>{label}</span>
                {config.identity[field] ? <img src={config.identity[field]} alt={`Prévia: ${label}`} /> : <div className={styles.imagePlaceholder}><ImagePlus size={18} /></div>}
                <div><label className={styles.uploadLabel}>Enviar<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(event) => void uploadAsset(field, event)} /></label>{config.identity[field] ? <button type="button" onClick={() => patchIdentity(field, '')}>Remover</button> : null}</div>
              </div>)}</div>
            </section>

            <section className={styles.controlPanel}>
              <h3>Cores</h3>
              <div className={styles.colorGrid}>{COLOR_FIELDS.map(([field, label]) => <label key={field} className={styles.colorField}><span>{label}</span><span><input type="color" value={config.colors[field]} onChange={(event) => patchColor(field, event.target.value.toUpperCase())} /><code>{config.colors[field]}</code></span></label>)}</div>
            </section>

            <section className={styles.controlPanel}>
              <h3>Tipografia</h3>
              <div className={styles.threeColumns}>
                <label>Fonte dos títulos<select value={config.typography.headingFont} onChange={(event) => patchTypography('headingFont', event.target.value as CampaignThemeConfig['typography']['headingFont'])}>{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label>
                <label>Fonte dos textos<select value={config.typography.bodyFont} onChange={(event) => patchTypography('bodyFont', event.target.value as CampaignThemeConfig['typography']['bodyFont'])}>{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label>
                <label>Fonte complementar<select value={config.typography.accentFont} onChange={(event) => patchTypography('accentFont', event.target.value as CampaignThemeConfig['typography']['accentFont'])}>{FONT_OPTIONS.map((font) => <option key={font}>{font}</option>)}</select></label>
              </div>
              <label className={styles.rangeLabel}><span>Peso tipográfico <strong>{config.typography.weight}</strong></span><input type="range" min="400" max="700" step="100" value={config.typography.weight} onChange={(event) => patchTypography('weight', Number(event.target.value))} /></label>
            </section>

            <section className={styles.controlPanel}>
              <h3>Componentes</h3>
              <div className={styles.rangeGrid}>
                <label className={styles.rangeLabel}><span>Arredondamento <strong>{config.components.borderRadius}px</strong></span><input type="range" min="0" max="24" value={config.components.borderRadius} onChange={(event) => patchComponents('borderRadius', Number(event.target.value))} /></label>
                <label className={styles.rangeLabel}><span>Sombras <strong>{Math.round(config.components.shadowIntensity * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={config.components.shadowIntensity} onChange={(event) => patchComponents('shadowIntensity', Number(event.target.value))} /></label>
                <label className={styles.rangeLabel}><span>Opacidade dos painéis <strong>{Math.round(config.components.panelOpacity * 100)}%</strong></span><input type="range" min="0.55" max="1" step="0.05" value={config.components.panelOpacity} onChange={(event) => patchComponents('panelOpacity', Number(event.target.value))} /></label>
                <label className={styles.rangeLabel}><span>Animações <strong>{Math.round(config.components.animationIntensity * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={config.components.animationIntensity} onChange={(event) => patchComponents('animationIntensity', Number(event.target.value))} /></label>
              </div>
              <div className={styles.twoColumns}>
                <label>Textura<select value={config.components.texture} onChange={(event) => patchComponents('texture', event.target.value as CampaignThemeConfig['components']['texture'])}><option value="none">Nenhuma</option><option value="paper">Papel</option><option value="ink">Tinta</option><option value="grain">Grão</option></select></label>
                <label>Divisores<select value={config.components.dividerStyle} onChange={(event) => patchComponents('dividerStyle', event.target.value as CampaignThemeConfig['components']['dividerStyle'])}><option value="solid">Sólido</option><option value="dashed">Tracejado</option><option value="ornamental">Ornamental</option></select></label>
              </div>
            </section>

            <section className={styles.controlPanel}>
              <h3>Configurações adicionais</h3>
              <div className={styles.threeColumns}>
                <label>Modo<select value={config.preferences.mode} onChange={(event) => patchPreferences('mode', event.target.value as 'dark' | 'light')}><option value="dark">Escuro</option><option value="light">Claro</option></select></label>
                <label>Posição do fundo<select value={config.preferences.backgroundPosition} onChange={(event) => patchPreferences('backgroundPosition', event.target.value as CampaignThemeConfig['preferences']['backgroundPosition'])}><option value="center">Centro</option><option value="top">Topo</option><option value="bottom">Base</option></select></label>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={config.preferences.decorativeElements} onChange={(event) => patchPreferences('decorativeElements', event.target.checked)} />Elementos decorativos</label>
              </div>
              <div className={styles.rangeGrid}>
                <label className={styles.rangeLabel}><span>Opacidade do fundo <strong>{Math.round(config.preferences.backgroundOpacity * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={config.preferences.backgroundOpacity} onChange={(event) => patchPreferences('backgroundOpacity', Number(event.target.value))} /></label>
                <label className={styles.rangeLabel}><span>Sobreposição <strong>{Math.round(config.preferences.imageOverlayOpacity * 100)}%</strong></span><input type="range" min="0" max="1" step="0.05" value={config.preferences.imageOverlayOpacity} onChange={(event) => patchPreferences('imageOverlayOpacity', Number(event.target.value))} /></label>
              </div>
              <label className={styles.overlayColor}>Cor da sobreposição<input type="color" value={config.preferences.imageOverlay} onChange={(event) => patchPreferences('imageOverlay', event.target.value.toUpperCase())} /><code>{config.preferences.imageOverlay}</code></label>
            </section>
          </div>

          <aside className={styles.previewColumn}>
            <div className={styles.previewHeading}><span><Eye size={15} /> Pré-visualização em tempo real</span><small>Isolada do tema publicado</small></div>
            <ThemePreview config={config} name={themeName} />
            <div className={styles.publishActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => void themeAction('restore')} disabled={busy}><RotateCcw size={14} />Restaurar padrão</button>
              <button type="button" className={styles.secondaryButton} onClick={() => void namedAction('savePreset')} disabled={busy}><Sparkles size={14} />Salvar predefinição</button>
              <button type="button" className={styles.saveButton} onClick={() => void saveDraft()} disabled={busy || !themeName.trim()}><Save size={14} />Salvar rascunho</button>
              <button type="button" className={styles.publishButton} onClick={() => void themeAction('publish')} disabled={busy}><Upload size={14} />Publicar</button>
              <button type="button" className={styles.applyButton} onClick={() => void themeAction('apply')} disabled={busy || !selectedTheme.publishedConfig}><Check size={14} />Aplicar à campanha</button>
            </div>
            <p className={styles.safetyNote}>Publicar atualiza a versão visível disponível. Aplicar define este tema como ativo; rascunhos nunca são exibidos aos jogadores.</p>
          </aside>
        </div>
      </> : null}
    </div>
  );
}
