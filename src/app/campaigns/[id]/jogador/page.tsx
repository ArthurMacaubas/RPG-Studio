'use client';
/* eslint-disable @next/next/no-img-element -- anexos podem ser URLs externas ou data URLs de upload. */

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Sparkles, UserRound, X } from 'lucide-react';
import { playerModeApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { PlayerCharacterPanel } from '@/components/PlayerCharacterPanel';
import { PlayerCombatPanel } from '@/components/PlayerCombatPanel';
import { PlayerRelationshipsPanel } from '@/components/PlayerRelationshipsPanel';
import type { Attachment, CampaignFile, FileType, PublicCampaignData, SheetData } from '@/types';
import { FILE_TYPE_LABELS, SYSTEM_LABELS } from '@/types';
import styles from './page.module.css';

function isImageAttachment(attachment: Attachment) {
  return Boolean(attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url));
}

function sheetData(file: CampaignFile): SheetData {
  return (file.data ?? {}) as SheetData;
}

export default function AuthenticatedPlayerPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<PublicCampaignData | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<FileType | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CampaignFile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    playerModeApi.getAuthenticated(params.id).then(setData).catch(() => setError(true));
  }, [params.id]);

  const visibleFiles = useMemo(() => data?.files ?? [], [data?.files]);
  const types = useMemo(() => Array.from(new Set(visibleFiles.map((file) => file.type))), [visibleFiles]);
  const characters = useMemo(() => visibleFiles.filter((file) => file.type === 'CHARACTER'), [visibleFiles]);
  const files = useMemo(() => visibleFiles.filter((file) => {
    const details = sheetData(file);
    const tags = (file.tags ?? []).map(({ tag }) => tag.name).join(' ');
    const haystack = `${file.name} ${file.description ?? ''} ${file.content ?? ''} ${tags} ${details.concept ?? ''} ${details.playerName ?? ''}`.toLowerCase();
    return (!query.trim() || haystack.includes(query.toLowerCase())) && (type === 'ALL' || file.type === type);
  }), [visibleFiles, query, type]);

  if (error) return <main className={styles.page}><EmptyState icon={<BookOpen size={18} />} title="Área de jogador indisponível" description="Você não tem acesso a esta campanha ou o Mestre ainda não publicou o Modo Jogador." /></main>;
  if (!data) return <main className={styles.loading}><Skeleton width="min(90vw, 900px)" height={58} radius="lg" /><Skeleton width="min(90vw, 900px)" height={270} radius="lg" /></main>;

  const selectedImages = selected?.attachments?.filter(isImageAttachment) ?? [];
  const selectedSheet = selected ? sheetData(selected) : null;

  return <main className={styles.page}>
    <header className={styles.hero}>
      {data.campaign.coverImage ? <img className={styles.cover} src={data.campaign.coverImage} alt="" /> : <div className={styles.mark}><BookOpen size={20} /></div>}
      <div className={styles.heroCopy}><span className={styles.eyebrow}>{SYSTEM_LABELS[data.campaign.system]} · visão autenticada</span><h1>{data.campaign.name}</h1><p>{data.campaign.description || 'Seu espaço de referência para a mesa. O conteúdo abaixo foi selecionado pelo Mestre.'}</p></div>
      <div className={styles.heroStats}><strong>{visibleFiles.length}</strong><span>itens liberados</span></div>
    </header>

    <PlayerCharacterPanel campaignId={params.id} system={data.campaign.system} />
    <PlayerCombatPanel campaignId={params.id} />
    <PlayerRelationshipsPanel relationships={data.relationships} />

    {characters.length > 0 && <section className={styles.spotlight}><div className={styles.spotlightIcon}><UserRound size={18} /></div><div><span className={styles.spotlightLabel}>Sua ficha em destaque</span><strong>{characters[0]?.name}</strong><small>{sheetData(characters[0]!).playerName ? `Jogador: ${sheetData(characters[0]!).playerName}` : 'Abra para consultar atributos, habilidades e inventário.'}</small></div><button type="button" className={styles.spotlightAction} onClick={() => setSelected(characters[0] ?? null)}>Abrir ficha</button></section>}

    <div className={styles.toolbar}><div className={styles.search}><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, tag, pista ou texto..." aria-label="Buscar conteúdo publicado" /></div><div className={styles.filters}><button type="button" className={type === 'ALL' ? styles.active : ''} onClick={() => setType('ALL')}>Todos <small>{visibleFiles.length}</small></button>{types.map((item) => <button type="button" key={item} className={type === item ? styles.active : ''} onClick={() => setType(item)}>{FILE_TYPE_LABELS[item]} <small>{visibleFiles.filter((file) => file.type === item).length}</small></button>)}</div></div>

    {files.length === 0 ? <EmptyState icon={<Search size={18} />} title="Nenhum conteúdo publicado" description="O Mestre ainda não liberou arquivos ou seus filtros não encontraram resultados." /> : <div className={styles.grid}>{files.map((file) => { const media = file.attachments?.find(isImageAttachment); const details = sheetData(file); return <button type="button" key={file.id} className={`${styles.card} ${file.type === 'CHARACTER' ? styles.characterCard : ''}`} onClick={() => setSelected(file)}>{media && <img className={styles.cardMedia} src={media.url} alt="" />}<span className={styles.cardTop}><span className={styles.cardIcon}><FileTypeIcon type={file.type} size={16} /></span><Badge tone={file.type === 'CHARACTER' ? 'accent' : 'info'}>{FILE_TYPE_LABELS[file.type]}</Badge></span><strong>{file.name}</strong>{file.type === 'CHARACTER' && details.concept && <span className={styles.cardMeta}><Sparkles size={12} /> {details.concept}</span>}{file.description && <p>{file.description}</p>}{(file.tags ?? []).length > 0 && <span className={styles.cardTags}>{file.tags?.slice(0, 3).map(({ tag }) => `#${tag.name}`).join(' · ')}</span>}</button>; })}</div>}

    {selected && <div className={styles.overlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><article className={styles.detail} role="dialog" aria-modal="true" aria-label={`Conteúdo ${selected.name}`}><button type="button" onClick={() => setSelected(null)} className={styles.close} aria-label="Fechar"><X size={17} /></button><div className={styles.detailType}><FileTypeIcon type={selected.type} size={13} /> {FILE_TYPE_LABELS[selected.type]}</div><h2>{selected.name}</h2>{selected.description && <p>{selected.description}</p>}{selected.type === 'CHARACTER' && selectedSheet && <div className={styles.characterSummary}><div><span>Jogador</span><strong>{selectedSheet.playerName || 'Não informado'}</strong></div><div><span>Nível / NEX</span><strong>{selectedSheet.level ?? 1}</strong></div><div><span>Itens</span><strong>{selectedSheet.inventory?.length ?? 0}</strong></div><div><span>Habilidades</span><strong>{selectedSheet.abilities?.length ?? 0}</strong></div></div>}{selectedImages.length > 0 && <div className={styles.detailGallery}>{selectedImages.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.label ?? selected.name} /></a>)}</div>}{(selected.tags ?? []).length > 0 && <div className={styles.detailTags}>{selected.tags?.map(({ tag }) => <span key={tag.id}>#{tag.name}</span>)}</div>}<div className={styles.content}>{selected.content || 'Este arquivo não possui texto adicional.'}</div></article></div>}
  </main>;
}
