'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { CampaignRole } from '@/lib/access';
import styles from './CampaignHeader.module.css';

const ROUTE_LABELS: Record<string, string> = {
  arquivos: 'Biblioteca', personagens: 'Personagens', npcs: 'NPCs', ameacas: 'Ameaças', locais: 'Locais', objetos: 'Objetos', pistas: 'Pistas', puzzles: 'Puzzles', documentos: 'Documentos', eventos: 'Eventos', sessoes: 'Sessões', timeline: 'Timeline', mapa: 'Mapa', investigacao: 'Quadro de Investigação', sala: 'Sala de Sessão', arquivados: 'Arquivados', lixeira: 'Lixeira', 'modo-jogador': 'Modo Jogador', convites: 'Convites e membros', 'importar-exportar': 'Importar e exportar', 'documentacao-json': 'Template JSON', configuracoes: 'Configurações', jogador: 'Área do jogador'
};

function resolveLocation(pathname: string, campaignId: string) {
  const relative = pathname.replace(`/campaigns/${campaignId}`, '').split('/').filter(Boolean);
  if (relative.length === 0) return 'Visão geral';
  if (relative[0] === 'arquivos' && relative[1]) return 'Editor de entidade';
  return ROUTE_LABELS[relative.at(-1) ?? ''] ?? 'Campanha';
}

export function CampaignHeader({ campaignId, campaignName, role }: { campaignId: string; campaignName: string; role: CampaignRole }) {
  const pathname = usePathname() ?? '';
  const location = resolveLocation(pathname, campaignId);
  const isRoot = location === 'Visão geral';

  return (
    <header className={styles.header}>
      <div className={styles.context}>
        <span className={styles.product}><Layers3 size={13} aria-hidden="true" /> Workspace de campanha</span>
        <div className={styles.crumbs} aria-label="Localização atual">
          <Link href={`/campaigns/${campaignId}` as never}>{campaignName}</Link>
          {!isRoot && <><ChevronRight size={14} aria-hidden="true" /><span>{location}</span></>}
        </div>
      </div>
      <Badge tone={role === 'OWNER' ? 'accent' : 'info'}>{role === 'OWNER' ? 'Mestre' : 'Jogador'}</Badge>
    </header>
  );
}
