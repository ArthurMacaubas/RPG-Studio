'use client';

import { useState } from 'react';
import { Dices } from 'lucide-react';
import styles from './DiceRoller.module.css';

export function DiceRoller({ label, modifier = 0, sides = 20 }: { label: string; modifier?: number; sides?: number }) {
  const [result, setResult] = useState<number | null>(null);
  function roll() {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    setResult(((random[0] ?? 0) % sides) + 1 + modifier);
  }
  return <span className={styles.wrap}><button type="button" className={styles.button} onClick={roll} aria-label={`Rolar ${label}`} title={`Rolar 1d${sides}${modifier ? ` ${modifier > 0 ? '+' : ''}${modifier}` : ''}`}><Dices size={12} /></button>{result !== null && <output className={styles.result} aria-live="polite">{result}</output>}</span>;
}
