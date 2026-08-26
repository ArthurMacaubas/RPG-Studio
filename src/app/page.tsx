import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { campaignService } from '@/services/campaignService';
import { SessionControls } from '@/components/SessionControls';
import { SYSTEM_LABELS } from '@/types';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

async function getHomeData() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return { user, campaigns: await campaignService.list() };
}

export default async function HomePage() {
  const { user, campaigns } = await getHomeData();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Mesa do Mestre</span>
          <h1 className={styles.title}>Suas campanhas</h1>
          <p className={styles.subtitle}>
            Crie, organize e execute suas campanhas de RPG em um só lugar.
          </p>
        </div>
        <div className={styles.actions}>
          <SessionControls userName={user.name} />
          <Link href="/campaigns/new" className={styles.newButton}>
          <Plus size={16} />
            Nova campanha
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>Nenhuma campanha ainda</h3>
          <p>Comece criando sua primeira campanha para desbloquear o Dashboard, Arquivos e o Compilador.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}` as never} className={styles.card}>
              <span className={styles.systemBadge}>{SYSTEM_LABELS[campaign.system]}</span>
              <div className={styles.cardName}>{campaign.name}</div>
              {campaign.description && (
                <div className={styles.cardDescription}>{campaign.description}</div>
              )}
              <div className={styles.cardMeta}>
                <span>{campaign._count.files} arquivos</span>
                <span>{campaign._count.sessions} sessões</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
