'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { THREEDET_RULEBOOK } from '@/lib/threeDetVictory';
import styles from './ThreeDetRulebook.module.css';

export function ThreeDetRulebook() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const categories = ['Todas', ...new Set(THREEDET_RULEBOOK.map((rule) => rule.category))];
  const rules = useMemo(() => THREEDET_RULEBOOK.filter((rule) => (category === 'Todas' || rule.category === category) && `${rule.title} ${rule.summary}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [category, query]);
  return <section className={styles.panel} aria-label="Compêndio de regras 3DeT Victory">
    <div className={styles.toolbar}><label className={styles.search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar regra" aria-label="Pesquisar regra" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categorizar regras">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className={styles.grid}>{rules.map((rule) => <article className={styles.card} key={rule.id}><span>{rule.category}</span><h2>{rule.title}</h2><p>{rule.summary}</p>{'source' in rule && <small>{rule.source}</small>}</article>)}</div>
    {rules.length === 0 && <p className={styles.empty}>Nenhuma regra corresponde à busca.</p>}
    <footer className={styles.notice}>Conteúdo resumido e original para apoio à mesa. Consulte a edição definitiva e suas erratas. Referência: <a href="https://site.jamboeditora.com.br/3det/" target="_blank" rel="noreferrer">site oficial</a> · <a href="https://jamboeditora.com.br/licenca-aberta/" target="_blank" rel="noreferrer">Licença Aberta da Jambô</a>.</footer>
  </section>;
}
