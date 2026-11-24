import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function DocumentosPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'DOCUMENT' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="DOCUMENT"
      title="Documentos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Documentos' }]}
      initialData={initialData}
    />
  );
}
