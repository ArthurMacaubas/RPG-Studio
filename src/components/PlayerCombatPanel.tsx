'use client';

import { useEffect, useState } from 'react';
import { Eye, HeartPulse, Swords } from 'lucide-react';
import { combatApi } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import type { PlayerCombatView } from '@/types';
import styles from './PlayerCombatPanel.module.css';

export function PlayerCombatPanel({ campaignId }: { campaignId: string }) {
  const [encounter, setEncounter] = useState<PlayerCombatView | null>(null);

  useEffect(() => {
    combatApi.playerView(campaignId).then(({ encounter: activeEncounter }) => setEncounter(activeEncounter)).catch(() => setEncounter(null));
  }, [campaignId]);

  if (!encounter) return null;

  return <section className={styles.panel} aria-label="Combate em andamento">
    <header><div className={styles.icon}><Swords size={17} /></div><div><span>Combate em andamento</span><h2>{encounter.name}</h2></div><Badge tone="success">Rodada {encounter.round}</Badge></header>
    <p className={styles.description}>A ordem da iniciativa é compartilhada pelo Mestre. Seus pontos de vida e condições aparecem apenas para a sua ficha.</p>
    <div className={styles.list}>{encounter.participants.map((participant) => <div className={`${styles.row} ${participant.isCurrentTurn ? styles.current : ''}`} key={participant.id}><span className={styles.initiative}>{participant.initiative}</span><div className={styles.name}><strong>{participant.name}</strong><small>{participant.isCurrentTurn ? 'Turno atual' : participant.kind === 'THREAT' ? 'Ameaça' : 'Participante'}</small></div>{participant.ownHp ? <div className={styles.ownStatus}><HeartPulse size={14} /><strong>{participant.ownHp.currentHp}/{participant.ownHp.maxHp ?? '—'}</strong>{participant.conditions.length > 0 && <small>{participant.conditions.join(' · ')}</small>}</div> : <span className={styles.hiddenStatus}><Eye size={13} /> iniciativa</span>}</div>)}</div>
  </section>;
}
