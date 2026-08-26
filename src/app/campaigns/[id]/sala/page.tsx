import { redirect } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';
import { SessionCommandCenter } from '@/components/SessionCommandCenter';

export default async function SessionRoomPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role !== 'OWNER') redirect(`/campaigns/${params.id}/jogador`);
  return <SessionCommandCenter campaignId={params.id} />;
}
