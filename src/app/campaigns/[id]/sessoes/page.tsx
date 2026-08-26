import { FileExplorer } from '@/components/FileExplorer';
import SessionPlanningPanel from './SessionPlanningPanel';
import { getCampaignAccess } from '@/lib/access';

export default async function SessoesPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  return (
    <>
      <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="SESSION"
      title="Sessões"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Sessões' }]}
    />
      {access.role === 'OWNER' && <SessionPlanningPanel campaignId={params.id} />}
    </>
  );
}
