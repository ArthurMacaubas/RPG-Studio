import { FileExplorer } from '@/components/FileExplorer';
import SessionPlanningPanel from './SessionPlanningPanel';
import { getCampaignAccess } from '@/lib/access';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function SessoesPage({ params }: { params: { id: string } }) {
  const [access, initialData] = await Promise.all([
    getCampaignAccess(params.id),
    getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'SESSION' })
  ]);
  return (
    <>
      <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="SESSION"
      title="Sessões"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Sessões' }]}
      initialData={initialData}
    />
      {access.role === 'OWNER' && <SessionPlanningPanel campaignId={params.id} />}
    </>
  );
}
