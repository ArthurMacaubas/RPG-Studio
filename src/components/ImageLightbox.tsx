'use client';
/* eslint-disable @next/next/no-img-element -- private media is delivered by an authenticated application route. */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from 'lucide-react';
import styles from './ImageLightbox.module.css';

type ImageLightboxProps = {
  image: { url: string; alt: string; caption?: string; width?: number | null; height?: number | null } | null;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

export function ImageLightbox({ image, onClose, onPrevious, onNext }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; pointerType: string } | null>(null);
  useEffect(() => {
    setZoom(1); setPan({ x: 0, y: 0 });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrevious?.();
      if (event.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [image, onClose, onNext, onPrevious]);
  if (!image) return null;
  return <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-label={`Visualizar ${image.alt}`}>
      <div className={styles.toolbar}>
        <span>{image.width && image.height ? `${image.width} × ${image.height}` : 'Imagem'}</span>
        <div>
          {onPrevious && <button type="button" onClick={onPrevious} aria-label="Imagem anterior"><ChevronLeft size={16} /></button>}
          {onNext && <button type="button" onClick={onNext} aria-label="Próxima imagem"><ChevronRight size={16} /></button>}
          <button type="button" onClick={() => setZoom((value) => Math.max(.5, value - .25))} aria-label="Diminuir zoom"><Minus size={16} /></button>
          <button type="button" onClick={() => setZoom((value) => Math.min(3, value + .25))} aria-label="Aumentar zoom"><Plus size={16} /></button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Tela cheia"><Maximize2 size={16} /></button>
          <button type="button" onClick={onClose} aria-label="Fechar visualização"><X size={17} /></button>
        </div>
      </div>
      <div className={styles.canvas} onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, pointerType: event.pointerType }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag.current) return; setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y }); }} onPointerUp={(event) => { const current = drag.current; drag.current = null; if (current?.pointerType === 'touch' && zoom === 1 && Math.abs(event.clientX - current.x) > 52) { if (event.clientX < current.x) onNext?.(); else onPrevious?.(); } }} onPointerCancel={() => { drag.current = null; }}><img src={image.url} alt={image.alt} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} /></div>
      {(image.caption || image.alt) && <p className={styles.caption}>{image.caption || image.alt}</p>}
    </section>
  </div>;
}
