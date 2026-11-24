import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function PistasPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'CLUE' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="CLUE"
      title="Pistas"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Pistas' }]}
      initialData={initialData}
    />
  );
}
