import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function ObjetosPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'OBJECT' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="OBJECT"
      title="Objetos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Objetos' }]}
      initialData={initialData}
    />
  );
}
