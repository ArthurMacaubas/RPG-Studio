import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function LocaisPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'LOCATION' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="LOCATION"
      title="Locais"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Locais' }]}
      initialData={initialData}
    />
  );
}
