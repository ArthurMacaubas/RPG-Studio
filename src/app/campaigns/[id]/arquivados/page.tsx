import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function ArquivadosPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'archived' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="archived"
      title="Arquivados"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Arquivados' }]}
      initialData={initialData}
    />
  );
}
