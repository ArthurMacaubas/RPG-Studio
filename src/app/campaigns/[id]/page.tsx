import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { campaignDashboardService } from '@/services/campaignDashboardService';
import { getCampaignAccess } from '@/lib/access';
import { CampaignHealthWidget } from '@/components/CampaignHealthWidget';
import { Badge } from '@/components/ui/Badge';
import { FileTypeIcon } from '@/components/fileTypeIcon';
import { SYSTEM_LABELS, FILE_TYPE_LABELS } from '@/types';
import styles from './page.module.css';

export default async function CampaignDashboardPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role === 'PLAYER') redirect(`/campaigns/${params.id}/jogador`);
  const dashboard = await campaignDashboardService.get(params.id);
  if (!dashboard) notFound();
  const { campaign, role, user, fileCount, sessionCount, favoriteCount, recentFiles, favoriteFiles, byType, currentSession, health } = dashboard;

  const maxTypeCount = Math.max(1, ...byType.map((t) => t._count._all));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTop}><div><span className={styles.eyebrow}>{SYSTEM_LABELS[campaign.system]}</span><h1 className={styles.title}>{campaign.name}</h1></div><Badge tone={role === 'OWNER' ? 'accent' : 'info'}>{role === 'OWNER' ? 'Mestre' : 'Jogador'}</Badge></div>
        <p className={styles.welcome}>Olá, {user.name}. Aqui está o estado atual da sua mesa.</p>
      </div>
      <div className={styles.quickActions}>
        {role === 'OWNER' ? <><Link href={`/campaigns/${campaign.id}/arquivos` as never} className={styles.quickAction}>+ Novo arquivo</Link><Link href={`/campaigns/${campaign.id}/sessoes` as never} className={styles.quickAction}>Planejar sessão</Link><Link href={`/campaigns/${campaign.id}/modo-jogador` as never} className={styles.quickAction}>Publicar para jogadores</Link><Link href={`/campaigns/${campaign.id}/jogador` as never} className={styles.quickAction}>Ver como jogador</Link></> : <Link href={`/campaigns/${campaign.id}/jogador` as never} className={styles.quickAction}>Abrir área de jogador</Link>}
      </div>

      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{fileCount}</div>
          <div className={styles.statLabel}>Arquivos</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{sessionCount}</div>
          <div className={styles.statLabel}>Sessões</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{favoriteCount}</div>
          <div className={styles.statLabel}>Favoritos</div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Últimas alterações</div>
            {recentFiles.length === 0 ? (
              <div className={styles.emptyRow}>Nenhum arquivo criado ainda.</div>
            ) : (
              recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/campaigns/${campaign.id}/arquivos/${file.id}` as never}
                  className={styles.fileRow}
                >
                  <FileTypeIcon type={file.type} size={13} />
                  {file.name}
                  <span className={styles.fileRowType}>{FILE_TYPE_LABELS[file.type]}</span>
                </Link>
              ))
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Favoritos</div>
            {favoriteFiles.length === 0 ? (
              <div className={styles.emptyRow}>Nenhum favorito ainda.</div>
            ) : (
              favoriteFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/campaigns/${campaign.id}/arquivos/${file.id}` as never}
                  className={styles.fileRow}
                >
                  <FileTypeIcon type={file.type} size={13} />
                  {file.name}
                  <span className={styles.fileRowType}>{FILE_TYPE_LABELS[file.type]}</span>
                </Link>
              ))
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelTitle}>Sessão atual</div>
            {currentSession ? (
              <div style={{ fontSize: 13 }}>{currentSession.name}</div>
            ) : (
              <div className={styles.emptyRow}>Nenhuma sessão planejada ainda.</div>
            )}
          </div>
        </div>

        <div className={styles.stack}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Arquivos por tipo</div>
            {byType.length === 0 ? (
              <div className={styles.emptyRow}>Nenhum arquivo ainda.</div>
            ) : (
              byType
                .sort((a, b) => b._count._all - a._count._all)
                .map((t) => (
                  <div key={t.type} className={styles.typeBarRow}>
                    <span className={styles.typeBarLabel}>{FILE_TYPE_LABELS[t.type]}</span>
                    <div className={styles.typeBarTrack}>
                      <div
                        className={styles.typeBarFill}
                        style={{ width: `${(t._count._all / maxTypeCount) * 100}%` }}
                      />
                    </div>
                    <span className={styles.typeBarCount}>{t._count._all}</span>
                  </div>
                ))
            )}
          </div>

          <CampaignHealthWidget campaignId={campaign.id} health={health} />
        </div>
      </div>
    </main>
  );
}
