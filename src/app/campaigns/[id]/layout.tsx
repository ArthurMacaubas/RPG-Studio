import { notFound } from 'next/navigation';
import { campaignService } from '@/services/campaignService';
import { getCampaignAccess } from '@/lib/access';
import { Sidebar } from '@/components/Sidebar';
import { CampaignHeader } from '@/components/CampaignHeader';
import styles from './layout.module.css';

export default async function CampaignLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const [campaign, access] = await Promise.all([campaignService.get(params.id), getCampaignAccess(params.id)]);

  if (!campaign) notFound();

  const favoriteFolders = campaign.favoriteFolders.map((folder) => ({
    ...folder,
    entries: folder.entries.map((entry) => ({
      ...entry,
      file: entry.file
        ? {
            ...entry.file,
            data: (entry.file.data ?? {}) as Record<string, unknown>,
            trashedAt: entry.file.trashedAt?.toISOString() ?? null,
            createdAt: entry.file.createdAt.toISOString(),
            updatedAt: entry.file.updatedAt.toISOString()
          }
        : undefined
    }))
  }));

  return (
    <div className={styles.shell}>
      <Sidebar campaignId={campaign.id} campaignName={campaign.name} role={access.role} favoriteFolders={favoriteFolders} />
      <div className={styles.content}>
        <CampaignHeader campaignId={campaign.id} campaignName={campaign.name} role={access.role} />
        <div className={styles.workspace}>{children}</div>
      </div>
    </div>
  );
}
