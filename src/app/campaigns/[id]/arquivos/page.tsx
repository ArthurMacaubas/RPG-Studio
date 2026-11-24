import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function ArquivosPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      title="Arquivos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Arquivos' }]}
      initialData={initialData}
    />
  );
}
