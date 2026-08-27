'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Eye, EyeOff, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { membersApi, playerModeApi, type CampaignMemberItem } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/ToastProvider';
import type { FileType, PlayerAccessPreviewData, PlayerModeConfigData, PlayerVisibilityRow } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import { CampaignBriefingEditor } from '@/components/CampaignBriefingEditor';
import styles from './page.module.css';

const publicationLabel = { PUBLIC: 'Público', GRANT: 'Grant', PRIVATE: 'Privado', ARCHIVED: 'Arquivado', UNAVAILABLE: 'Indisponível' } as const;
const publicationTone = { PUBLIC: 'success', GRANT: 'warning', PRIVATE: 'neutral', ARCHIVED: 'warning', UNAVAILABLE: 'danger' } as const;

export default function PlayerModePage({ params }: { params: { id: string } }) {
  const campaignId = params?.id ?? '';
  const [config, setConfig] = useState<PlayerModeConfigData | null>(null);
  const [files, setFiles] = useState<PlayerVisibilityRow[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileType | 'ALL'>('ALL');
  const [onlyVisible, setOnlyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<CampaignMemberItem[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [preview, setPreview] = useState<PlayerAccessPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [data, campaignMembers] = await Promise.all([playerModeApi.get(campaignId), membersApi.list(campaignId)]);
      setConfig(data.config);
      setFiles(data.files);
      setMembers(campaignMembers);
      setSelectedMemberId((current) => current && campaignMembers.some((member) => member.userId === current) ? current : campaignMembers[0]?.userId ?? '');
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível carregar o Modo Jogador', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }, [campaignId, toast]);

  useEffect(() => { void load(); }, [load]);

  const visibleCount = files.filter((file) => file.state === 'PUBLIC' || file.state === 'GRANT').length;
  const types = useMemo(() => Array.from(new Set(files.map((file) => file.type))), [files]);
  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return files.filter((file) => (!normalized || file.name.toLowerCase().includes(normalized)) && (typeFilter === 'ALL' || file.type === typeFilter) && (!onlyVisible || file.isVisible));
  }, [files, onlyVisible, query, typeFilter]);

  async function toggleEnabled() {
    if (!config) return;
    try {
      const updated = await playerModeApi.setEnabled(campaignId, !config.isEnabled);
      setConfig(updated);
      toast({ tone: updated.isEnabled ? 'success' : 'info', title: updated.isEnabled ? 'Modo Jogador publicado' : 'Modo Jogador pausado', message: updated.isEnabled ? 'O link já pode ser compartilhado.' : 'O conteúdo deixou de estar acessível.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível alterar a publicação', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  async function toggleFile(fileId: string, isVisible: boolean) {
    const previous = files;
    setFiles((current) => current.map((file) => file.id === fileId ? { ...file, isVisible } : file));
    try {
      await playerModeApi.setFileVisibility(fileId, isVisible);
      toast({ tone: 'success', title: isVisible ? 'Arquivo publicado' : 'Arquivo ocultado', message: 'A curadoria foi salva e a política server-side será aplicada nas próximas leituras.' });
    } catch (error) {
      setFiles(previous);
      toast({ tone: 'error', title: 'Falha ao atualizar visibilidade', message: error instanceof Error ? error.message : 'A alteração foi desfeita.' });
    }
  }

  async function setMany(visible: boolean) {
    const targetIds = filteredFiles.filter((file) => file.state !== 'ARCHIVED' && file.state !== 'UNAVAILABLE' && file.isVisible !== visible).map((file) => file.id);
    if (targetIds.length === 0) return;
    const previous = files;
    setFiles((current) => current.map((file) => targetIds.includes(file.id) ? { ...file, isVisible: visible } : file));
    try {
      await Promise.all(targetIds.map((fileId) => playerModeApi.setFileVisibility(fileId, visible)));
      toast({ tone: 'success', title: visible ? 'Conteúdo publicado' : 'Conteúdo ocultado', message: `${targetIds.length} arquivo(s) atualizado(s).` });
    } catch (error) {
      setFiles(previous);
      toast({ tone: 'error', title: 'Alteração parcial não concluída', message: error instanceof Error ? error.message : 'As mudanças foram desfeitas.' });
    }
  }

  async function copyLink() {
    if (!config?.shareSlug) return;
    const url = `${window.location.origin}/jogador/${config.shareSlug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ tone: 'success', title: 'Link copiado', message: 'Envie o endereço aos jogadores.' });
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function loadMemberPreview() {
    if (!selectedMemberId) return;
    setPreviewLoading(true);
    try {
      setPreview(await playerModeApi.previewMember(campaignId, selectedMemberId));
    } catch (error) {
      setPreview(null);
      toast({ tone: 'error', title: 'Prévia indisponível', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setPreviewLoading(false);
    }
  }

  if (!config) return <main className={styles.loading}><Skeleton width="min(90vw, 900px)" height={42} radius="md" /><Skeleton width="min(90vw, 900px)" height={170} radius="lg" /><Skeleton width="min(90vw, 900px)" height={340} radius="lg" /></main>;

  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>Publicação controlada</div><h1 className={styles.title}>Modo Jogador</h1><p className={styles.subtitle}>Monte uma vitrine segura da campanha. Só os arquivos publicados abaixo ficam visíveis para os jogadores.</p></div><Link href={`/campaigns/${campaignId}`} className={styles.backLink}>Voltar à campanha</Link></header>

    <CampaignBriefingEditor campaignId={campaignId} />

    <Panel className={styles.publishPanel} eyebrow="Status de publicação" title={config.isEnabled ? 'A campanha está disponível' : 'A campanha está pausada'} action={<button type="button" className={`${styles.switch} ${config.isEnabled ? styles.switchOn : ''}`} onClick={() => void toggleEnabled()} aria-label="Ativar ou desativar Modo Jogador" aria-pressed={config.isEnabled}><span /></button>}>
      <div className={styles.publishBody}><div className={styles.publishSummary}><Badge tone={config.isEnabled ? 'success' : 'warning'}>{config.isEnabled ? 'Publicado' : 'Pausado'}</Badge><span>{visibleCount} de {files.length} arquivos publicados</span></div>{config.isEnabled && config.shareSlug ? <div className={styles.shareRow}><input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/jogador/${config.shareSlug}`} aria-label="Link público da campanha" /><Button variant="secondary" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copyLink()}>{copied ? 'Copiado' : 'Copiar link'}</Button><Link href={`/jogador/${config.shareSlug}`} target="_blank" className={styles.previewLink}><ExternalLink size={13} /> Prévia</Link></div> : <p className={styles.publishHint}>Ative a publicação para gerar um link compartilhável.</p>}</div>
    </Panel>

    <Panel className={styles.previewPanel} eyebrow="Ver como jogador" title="Prévia baseada em autorização real" action={<Badge tone="info"><Eye size={12} /> seguro no servidor</Badge>}>
      {members.length === 0 ? <EmptyState icon={<ShieldCheck size={18} />} title="Ainda não há jogadores" description="Convide um jogador para conferir o que ele receberá na campanha." /> : <div className={styles.previewContent}>
        <p className={styles.previewDescription}>Selecione um jogador para consultar o mesmo filtro de publicação e grants usado pela área autenticada. A prévia não depende de esconder itens no navegador.</p>
        <div className={styles.previewControls}><label><span>Jogador</span><select value={selectedMemberId} onChange={(event) => { setSelectedMemberId(event.target.value); setPreview(null); }} aria-label="Selecionar jogador para prévia">{members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name} · {member.user.email}</option>)}</select></label><Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={() => void loadMemberPreview()} disabled={!selectedMemberId || previewLoading}>{previewLoading ? 'Consultando…' : 'Atualizar prévia'}</Button></div>
        {preview ? <div className={styles.previewResult}><div className={styles.previewSummary}><div><span>Jogador selecionado</span><strong>{preview.member.name}</strong></div><div><span>Conteúdo publicado</span><strong>{preview.publishedCount}</strong></div><div><span>Grants individuais</span><strong>{preview.grantCount}</strong></div><div><span>Modo jogador</span><Badge tone={preview.modeEnabled ? 'success' : 'warning'}>{preview.modeEnabled ? 'Ativo' : 'Pausado'}</Badge></div></div>{preview.files.length === 0 ? <EmptyState icon={<EyeOff size={18} />} title="Nenhum conteúdo disponível" description="Este jogador não possui arquivos publicados ou grants ativos no momento." /> : <div className={styles.previewFiles}>{preview.files.map((file) => <div key={file.id} className={styles.previewFile}><span><strong>{file.name}</strong><small>{FILE_TYPE_LABELS[file.type]}</small></span><div>{file.tags.map((tag) => <i key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</i>)}<Badge tone={file.access === 'GRANT' ? 'warning' : 'success'}>{file.access === 'GRANT' ? 'Grant' : 'Publicado'}</Badge></div></div>)}</div>}</div> : <p className={styles.previewHint}>Atualize a prévia para conferir exatamente quais arquivos e tags estão acessíveis ao membro selecionado.</p>}
      </div>}
    </Panel>

    <Panel className={styles.visibilityPanel} eyebrow="Curadoria de conteúdo" title="O que os jogadores podem ver" action={<Badge tone="info"><ShieldCheck size={12} /> leitura controlada</Badge>}>
      <div className={styles.toolbar}><div className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome..." aria-label="Buscar arquivos para publicar" /></div><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FileType | 'ALL')} aria-label="Filtrar por tipo"><option value="ALL">Todos os tipos</option>{types.map((type) => <option key={type} value={type}>{FILE_TYPE_LABELS[type]}</option>)}</select><label className={styles.onlyVisible}><input type="checkbox" checked={onlyVisible} onChange={(event) => setOnlyVisible(event.target.checked)} /> Somente publicados</label></div>
      <div className={styles.bulkBar}><span>{filteredFiles.length} arquivo(s) na seleção atual</span><div><Button variant="ghost" size="sm" icon={<Eye size={14} />} onClick={() => void setMany(true)}>Publicar filtrados</Button><Button variant="ghost" size="sm" icon={<EyeOff size={14} />} onClick={() => void setMany(false)}>Ocultar filtrados</Button></div></div>
      {files.length === 0 ? <EmptyState icon={<EyeOff size={18} />} title="Nenhum arquivo para publicar" description="Crie arquivos na campanha e eles aparecerão aqui para curadoria." /> : filteredFiles.length === 0 ? <EmptyState icon={<Search size={18} />} title="Nenhum resultado" description="Ajuste a busca ou remova os filtros para encontrar outros arquivos." /> : <div className={styles.fileList}>{filteredFiles.map((file) => { const unavailable = file.state === 'ARCHIVED' || file.state === 'UNAVAILABLE'; return <label key={file.id} className={`${styles.fileRow} ${file.isVisible ? styles.fileRowVisible : ''} ${unavailable ? styles.fileRowUnavailable : ''}`}><input type="checkbox" checked={file.isVisible} disabled={unavailable} onChange={(event) => void toggleFile(file.id, event.target.checked)} /><span className={styles.fileMain}><strong>{file.name}</strong><small>{FILE_TYPE_LABELS[file.type]}{file.restrictToGrants ? ' · acesso por grant' : ''}</small></span><Badge tone={publicationTone[file.state]}>{publicationLabel[file.state]}</Badge><Link href={`/campaigns/${campaignId}/arquivos/${file.id}`} className={styles.fileOpen} aria-label={`Abrir ${file.name}`}><ExternalLink size={13} /></Link></label>; })}</div>}
    </Panel>
  </main>;
}
