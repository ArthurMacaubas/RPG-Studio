'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, Eye, Plus, Radio, ShieldCheck, Trash2, Users } from 'lucide-react';
import { tagsApi, campaignsApi } from '@/lib/api';
import { CustomSystemBuilder } from '@/components/CustomSystemBuilder';
import type { Campaign, Tag } from '@/types';
import { SYSTEM_LABELS } from '@/types';
import styles from './page.module.css';

const DEFAULT_COLOR = '#7B5CFF';

export default function ConfiguracoesPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params?.id ?? '';
  const [tags, setTags] = useState<Tag[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isCustomSystem, setIsCustomSystem] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [tagList, campaign] = await Promise.all([tagsApi.list(campaignId), campaignsApi.get(campaignId)]);
    setTags(tagList);
    setCampaign(campaign);
    setIsCustomSystem(campaign.system === 'CUSTOM');
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function createTag() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await tagsApi.create({ campaignId, name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor(DEFAULT_COLOR);
      refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTag(id: string, patch: Partial<Pick<Tag, 'name' | 'color' | 'description'>>) {
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    await tagsApi.update(id, patch);
  }

  async function removeTag(id: string) {
    await tagsApi.remove(id);
    refresh();
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Configurações</h1>
      <p className={styles.subtitle}>Preferências e recursos compartilhados desta campanha.</p>

      <div className={`${styles.panel} ${styles.overviewPanel}`}>
        <div className={styles.panelTitle}>Centro de controle</div>
        <div className={styles.panelHint}>Atalhos para as decisões que mais impactam a experiência da mesa{campaign ? ` · ${SYSTEM_LABELS[campaign.system]}` : ''}.</div>
        <div className={styles.settingsGrid}>
          <Link href={`/campaigns/${campaignId}/convites` as never} className={styles.settingsCard}><Users size={17} /><span><strong>Membros e convites</strong><small>Gerencie quem participa da campanha.</small></span></Link>
          <Link href={`/campaigns/${campaignId}/modo-jogador` as never} className={styles.settingsCard}><Eye size={17} /><span><strong>Visibilidade do jogador</strong><small>Escolha o que aparece na área autenticada.</small></span></Link>
          <Link href={`/campaigns/${campaignId}/sala` as never} className={styles.settingsCard}><Radio size={17} /><span><strong>Sala de sessão</strong><small>Controle o ritmo e a pauta da mesa.</small></span></Link>
          <Link href={`/campaigns/${campaignId}/importar-exportar` as never} className={styles.settingsCard}><Download size={17} /><span><strong>Backup e exportação</strong><small>Gere uma cópia visual ou documental.</small></span></Link>
        </div>
        <div className={styles.accessNote}><ShieldCheck size={16} /><span><strong>Visibilidade por acesso</strong> Tags só aparecem para jogadores quando estão vinculadas a pelo menos um arquivo que eles podem visualizar. O catálogo completo continua disponível para o Mestre.</span></div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelTitle}>Tags</div>
        <div className={styles.panelHint}>
          Crie, edite a cor e a descrição, ou exclua as tags usadas nos arquivos desta campanha.
        </div>

        <div className={styles.tagList}>
          {tags.length === 0 && <div className={styles.emptyRow}>Nenhuma tag criada ainda.</div>}
          {tags.map((tag) => (
            <div key={tag.id} className={styles.tagRow}>
              <input
                type="color"
                className={styles.colorDot}
                value={tag.color}
                onChange={(e) => updateTag(tag.id, { color: e.target.value })}
                aria-label={`Cor da tag ${tag.name}`}
              />
              <input
                className={styles.tagNameInput}
                value={tag.name}
                onChange={(e) => setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name: e.target.value } : t)))}
                onBlur={(e) => updateTag(tag.id, { name: e.target.value })}
              />
              <input
                className={styles.tagDescInput}
                placeholder="Descrição opcional"
                value={tag.description ?? ''}
                onChange={(e) =>
                  setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, description: e.target.value } : t)))
                }
                onBlur={(e) => updateTag(tag.id, { description: e.target.value })}
              />
              <button className={styles.tagDelete} onClick={() => removeTag(tag.id)} aria-label={`Excluir tag ${tag.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className={styles.newTagRow}>
          <input
            type="color"
            className={styles.colorInput}
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            aria-label="Cor da nova tag"
          />
          <input
            className={styles.nameInput}
            placeholder="Nome da nova tag"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTag()}
          />
          <button className={styles.addButton} onClick={createTag} disabled={submitting || !newName.trim()}>
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            Criar tag
          </button>
        </div>
      </div>

      {isCustomSystem && <CustomSystemBuilder campaignId={campaignId} />}
    </main>
  );
}
