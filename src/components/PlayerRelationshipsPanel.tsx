import { GitFork, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PlayerRelationship, RelationshipImportance } from '@/types';
import styles from './PlayerRelationshipsPanel.module.css';

const IMPORTANCE_LABELS: Record<RelationshipImportance, string> = { CRITICAL: 'Crítica', IMPORTANT: 'Importante', NORMAL: 'Normal', OPTIONAL: 'Opcional' };

export function PlayerRelationshipsPanel({ relationships }: { relationships: PlayerRelationship[] }) {
  if (relationships.length === 0) return null;
  return <section className={styles.panel}><header><div className={styles.icon}><GitFork size={17} /></div><div><span>Conexões reveladas</span><h2>Relacionamentos oficiais</h2></div><Badge tone="info">{relationships.length}</Badge></header><p>Estas conexões foram publicadas pelo Mestre entre conteúdos que você já pode consultar.</p><div className={styles.list}>{relationships.map((relationship) => <article key={relationship.id}><div className={styles.line}><strong>{relationship.sourceName}</strong><Link2 size={13} /><strong>{relationship.targetName}</strong><Badge tone={relationship.importance === 'CRITICAL' ? 'danger' : relationship.importance === 'IMPORTANT' ? 'warning' : 'neutral'}>{IMPORTANCE_LABELS[relationship.importance]}</Badge></div><span className={styles.type}>{relationship.type.name}{relationship.label ? ` · ${relationship.label}` : ''}</span>{relationship.description && <small>{relationship.description}</small>}</article>)}</div></section>;
}
