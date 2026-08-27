'use client';
/* eslint-disable @next/next/no-img-element -- imagens podem ser URLs externas ou data URLs armazenadas como anexos. */

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { playerModeApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { PlayerRelationshipsPanel } from '@/components/PlayerRelationshipsPanel';
import { PlayerBriefingTimeline } from '@/components/PlayerBriefingTimeline';
import type { CampaignFile, FileType, PublicCampaignData } from '@/types';
import { FILE_TYPE_LABELS, SYSTEM_LABELS } from '@/types';
import styles from './page.module.css';

export default function PlayerPublicPage({ params }: { params: { shareSlug: string } }) {
  const [data, setData] = useState<PublicCampaignData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<CampaignFile | null>(null);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState<FileType | 'ALL'>('ALL');

  useEffect(() => {
    playerModeApi.getPublic(params.shareSlug).then(setData).catch(() => setNotFound(true));
  }, [params.shareSlug]);

  const types = useMemo(() => Array.from(new Set((data?.files ?? []).map((file) => file.type))), [data?.files]);
  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.files ?? []).filter((file) => (!normalized || `${file.name} ${file.description ?? ''} ${file.content ?? ''}`.toLowerCase().includes(normalized)) && (activeType === 'ALL' || file.type === activeType));
  }, [activeType, data?.files, query]);
  const grouped = useMemo(() => filteredFiles.reduce<Record<string, CampaignFile[]>>((groups, file) => { (groups[file.type] ??= []).push(file); return groups; }, {}), [filteredFiles]);

  if (notFound) return <div className={styles.page}><div className={styles.errorState}><BookOpen size={24} /><h1>Este link não está mais disponível</h1><p>Peça ao Mestre um novo endereço de acesso à campanha.</p></div></div>;
  if (!data) return <div className={styles.loading}><Skeleton width="180px" height={12} radius="pill" /><Skeleton width="min(70vw, 430px)" height={48} radius="md" /><Skeleton width="min(90vw, 760px)" height={180} radius="lg" /></div>;

  return <div className={styles.page}>
    <main className={styles.container}>
      <header className={styles.hero}><div className={styles.heroMark}><BookOpen size={20} /></div><div><span className={styles.eyebrow}>{SYSTEM_LABELS[data.campaign.system]} · Área do jogador</span><h1 className={styles.title}>{data.campaign.name}</h1>{data.campaign.description && <p className={styles.description}>{data.campaign.description}</p>}</div></header>
      <div className={styles.stats}><span><strong>{data.files.length}</strong> conteúdos liberados</span><span><strong>{types.length}</strong> categorias</span><span>somente leitura</span></div>
      <PlayerBriefingTimeline briefing={data.briefing} timeline={data.timeline} />
      <PlayerRelationshipsPanel relationships={data.relationships} />
      <div className={styles.toolbar}><div className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na campanha..." aria-label="Buscar conteúdo da campanha" /></div><div className={styles.filters}><button type="button" className={`${styles.filter} ${activeType === 'ALL' ? styles.filterActive : ''}`} onClick={() => setActiveType('ALL')}>Todos</button>{types.map((type) => <button type="button" key={type} className={`${styles.filter} ${activeType === type ? styles.filterActive : ''}`} onClick={() => setActiveType(type)}>{FILE_TYPE_LABELS[type]}</button>)}</div></div>

      {data.files.length === 0 ? <EmptyState icon={<BookOpen size={18} />} title="Nada foi liberado ainda" description="O Mestre ainda não publicou conteúdos para esta mesa." /> : filteredFiles.length === 0 ? <EmptyState icon={<Search size={18} />} title="Nenhum conteúdo encontrado" description="Tente outra palavra ou escolha outra categoria." /> : <div className={styles.groups}>{Object.entries(grouped).map(([type, group]) => <section key={type} className={styles.group}><div className={styles.groupHeading}><span>{FILE_TYPE_LABELS[type as FileType]}</span><Badge tone="neutral">{group.length}</Badge></div><div className={styles.grid}>{group.map((file) => <button type="button" key={file.id} className={styles.card} onClick={() => setSelected(file)}><div className={styles.cardTop}><span className={styles.icon}><FileTypeIcon type={file.type} size={16} /></span><Badge tone="info">{FILE_TYPE_LABELS[file.type]}</Badge></div>{file.attachments?.find((attachment) => attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url)) && <img className={styles.cardMedia} src={file.attachments.find((attachment) => attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url))?.url} alt="" />}<strong className={styles.cardName}>{file.name}</strong>{file.description && <span className={styles.cardDescription}>{file.description}</span>}{file.tags && file.tags.length > 0 && <div className={styles.tags}>{file.tags.slice(0, 3).map(({ tag }) => <span key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>{tag.name}</span>)}</div>}<span className={styles.readMore}>Abrir conteúdo →</span></button>)}</div></section>)}</div>}
    </main>

    {selected && <div className={styles.detailOverlay} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><article className={styles.detailCard} role="dialog" aria-modal="true" aria-label={`Conteúdo ${selected.name}`}><button type="button" className={styles.detailClose} onClick={() => setSelected(null)} aria-label="Fechar conteúdo"><X size={18} /></button><div className={styles.detailMeta}><FileTypeIcon type={selected.type} size={14} /> <span>{FILE_TYPE_LABELS[selected.type]}</span></div><h2 className={styles.detailTitle}>{selected.name}</h2>{selected.description && <p className={styles.detailDescription}>{selected.description}</p>}{selected.attachments?.filter((attachment) => attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url)).length ? <div className={styles.detailGallery}>{selected.attachments.filter((attachment) => attachment.mimeType?.startsWith('image/') || /^(?:data:image\/|.*\.(png|jpe?g|gif|webp|svg)(?:\?|$))/i.test(attachment.url)).map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt={attachment.label ?? selected.name} /></a>)}</div> : null}<div className={styles.detailDivider} />{selected.content ? <div className={styles.detailContent}>{selected.content}</div> : <p className={styles.noContent}>Este conteúdo não possui texto adicional.</p>}</article></div>}
  </div>;
}
