import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function NpcsPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'NPC' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="NPC"
      title="NPCs"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'NPCs' }]}
      initialData={initialData}
    />
  );
}
