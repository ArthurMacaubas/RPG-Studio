import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function EventosPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'EVENT' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="EVENT"
      title="Eventos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Eventos' }]}
      initialData={initialData}
    />
  );
}
