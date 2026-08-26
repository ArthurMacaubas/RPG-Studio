import { redirect } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';
import { PlayerInvestigationBoard } from '@/components/PlayerInvestigationBoard';

export default async function PlayerInvestigationPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role === 'OWNER') redirect(`/campaigns/${params.id}/investigacao`);
  return <PlayerInvestigationBoard campaignId={params.id} />;
}
