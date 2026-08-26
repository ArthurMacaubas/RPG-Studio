'use client';
'use client';

import { useEffect, useState } from 'react';
import { Command, Search } from 'lucide-react';
import { searchApi, type GlobalSearchResult } from '@/lib/api';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './CommandPalette.module.css';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchApi.search(query).then((data) => setResults(data.results)).catch(() => setResults([])).finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  function go(href: string) {
    setOpen(false);
    setQuery('');
    setResults([]);
    window.location.assign(href);
  }

  function resultHref(result: GlobalSearchResult) {
    return result.kind === 'campaign' ? `/campaigns/${result.campaignId}` : `/campaigns/${result.campaignId}/arquivos/${result.id}`;
  }

  return <>
    <button type="button" className={styles.trigger} onClick={() => setOpen(true)} aria-label="Abrir busca global"><Search size={14} /><span>Buscar no Studio</span><kbd><Command size={11} />K</kbd></button>
    {open && <div className={styles.backdrop} role="presentation" onMouseDown={() => setOpen(false)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Busca global" onMouseDown={(event) => event.stopPropagation()}><div className={styles.searchRow}><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar campanhas, pistas, NPCs, eventos..." aria-label="Buscar no Studio" /></div><div className={styles.results}><button type="button" onClick={() => go('/campaigns/new')} className={styles.result}><span className={styles.resultIcon}>+</span><span><strong>Nova campanha</strong><small>Criar uma nova mesa</small></span></button><button type="button" onClick={() => go('/convites')} className={styles.result}><span className={styles.resultIcon}>@</span><span><strong>Convites recebidos</strong><small>Ver convites para jogar</small></span></button>{loading && <p className={styles.noResults}>Buscando no Studio...</p>}{!loading && query.trim().length < 2 && <p className={styles.noResults}>Digite pelo menos 2 caracteres para buscar.</p>}{!loading && query.trim().length >= 2 && results.map((result) => <button type="button" key={`${result.kind}-${result.id}`} onClick={() => go(resultHref(result))} className={styles.result}><span className={styles.resultIcon}>{result.name.slice(0, 1).toUpperCase()}</span><span><strong>{result.name}</strong><small>{result.kind === 'campaign' ? 'Campanha' : `${FILE_TYPE_LABELS[result.type ?? 'DOCUMENT']} · ${result.campaignName}`}</small></span></button>)}{!loading && query.trim().length >= 2 && results.length === 0 && <p className={styles.noResults}>Nenhum resultado encontrado.</p>}</div><footer className={styles.footer}>Pressione <kbd>Esc</kbd> para fechar</footer></section></div>}
  </>;
}
