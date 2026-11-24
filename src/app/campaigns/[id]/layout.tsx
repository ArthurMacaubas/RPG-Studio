import { notFound } from 'next/navigation';
import { campaignService } from '@/services/campaignService';
import { getCampaignAccess } from '@/lib/access';
import { Sidebar } from '@/components/Sidebar';
import { CampaignHeader } from '@/components/CampaignHeader';
import { CampaignThemeRuntime } from '@/components/CampaignThemeRuntime';
import { themeConfigToStyle } from '@/lib/campaignTheme';
import { campaignThemeService } from '@/services/campaignThemeService';
import styles from './layout.module.css';

export default async function CampaignLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const [campaign, access, publishedTheme] = await Promise.all([
    campaignService.get(params.id),
    getCampaignAccess(params.id),
    campaignThemeService.publishedForCampaign(params.id)
  ]);

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
    <div
      className={styles.shell}
      data-campaign-theme={publishedTheme?.id}
      data-theme-texture={publishedTheme?.config.components.texture}
      data-theme-decorations={publishedTheme?.config.preferences.decorativeElements ? 'on' : 'off'}
      style={publishedTheme ? themeConfigToStyle(publishedTheme.config) : undefined}
    >
      <CampaignThemeRuntime faviconUrl={publishedTheme?.config.identity.faviconUrl} />
      <Sidebar
        campaignId={campaign.id}
        campaignName={campaign.name}
        campaignSubtitle={publishedTheme?.config.identity.subtitle}
        logoUrl={publishedTheme?.config.identity.logoUrl}
        symbolUrl={publishedTheme?.config.identity.symbolUrl}
        role={access.role}
        favoriteFolders={favoriteFolders}
      />
      <div className={styles.content}>
        <CampaignHeader
          campaignId={campaign.id}
          campaignName={campaign.name}
          subtitle={publishedTheme?.config.identity.subtitle}
          bannerUrl={publishedTheme?.config.identity.bannerUrl}
          role={access.role}
        />
        <div className={styles.workspace}>{children}</div>
      </div>
    </div>
  );
}
