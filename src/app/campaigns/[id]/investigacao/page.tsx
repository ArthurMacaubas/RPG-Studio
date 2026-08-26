import { redirect } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';
import InvestigationBoardEditor from './InvestigationBoardEditor';

export default async function InvestigationBoardPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role === 'PLAYER') redirect(`/campaigns/${params.id}/jogador/investigacao`);
  return <InvestigationBoardEditor />;
}
