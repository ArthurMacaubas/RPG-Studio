'use client';

import { useState } from 'react';
import { Dices } from 'lucide-react';
import { rollThreeDetTest } from '@/lib/threeDetVictory';
import styles from './DiceRoller.module.css';

export function ThreeDetRoller({ label, attribute, hasSkill = false }: { label: string; attribute: number; hasSkill?: boolean }) {
  const [result, setResult] = useState<ReturnType<typeof rollThreeDetTest> | null>(null);
  function roll() {
    setResult(rollThreeDetTest({ attribute, hasSkill, random: () => crypto.getRandomValues(new Uint32Array(1))[0]! / 0x100000000 }));
  }
  return <span className={styles.wrap}>
    <button type="button" className={styles.button} onClick={roll} aria-label={`Rolar ${label}`} title={`Rolar teste de ${label}`}><Dices size={12} /></button>
    {result && <output className={styles.result} aria-live="polite">{result.total}{result.criticalFailure ? ' · falha crítica' : result.criticalCount ? ` · ${result.criticalCount} crítico(s)` : ''}</output>}
  </span>;
}
