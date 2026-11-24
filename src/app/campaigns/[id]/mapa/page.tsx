import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function MapaPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'MAP' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="MAP"
      title="Mapa"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Mapa' }]}
      initialData={initialData}
    />
  );
}
