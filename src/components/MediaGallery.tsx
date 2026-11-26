'use client';
/* eslint-disable @next/next/no-img-element -- private media is delivered through an authenticated route. */

import { useState } from 'react';
import type { MediaReference } from '@/types';
import { ImageLightbox } from './ImageLightbox';
import styles from './MediaGallery.module.css';

export function MediaGallery({ references, columns = 3 }: { references: MediaReference[]; columns?: 2 | 3 | 4 }) {
  const [selected, setSelected] = useState<MediaReference | null>(null);
  const visible = references.filter((reference) => reference.asset);
  if (!visible.length) return null;
  const selectedIndex = selected ? visible.findIndex((reference) => reference.id === selected.id) : -1;
  const navigate = (direction: -1 | 1) => {
    if (selectedIndex < 0) return;
    setSelected(visible[(selectedIndex + direction + visible.length) % visible.length] ?? null);
  };
  return <section className={styles.gallery} style={{ '--gallery-columns': columns } as React.CSSProperties} aria-label="Galeria de imagens">{visible.map((reference) => {
    const asset = reference.asset!;
    return <figure key={reference.id}><button type="button" onClick={() => setSelected(reference)}><img src={`/api/media/${asset.id}`} alt={asset.altText || asset.displayName} loading="lazy" /></button>{reference.caption && <figcaption>{reference.caption}</figcaption>}</figure>;
  })}<ImageLightbox image={selected?.asset ? { url: `/api/media/${selected.asset.id}`, alt: selected.asset.altText || selected.asset.displayName, caption: selected.caption || selected.asset.description || undefined, width: selected.asset.width, height: selected.asset.height } : null} onClose={() => setSelected(null)} onPrevious={visible.length > 1 ? () => navigate(-1) : undefined} onNext={visible.length > 1 ? () => navigate(1) : undefined} /></section>;
}
