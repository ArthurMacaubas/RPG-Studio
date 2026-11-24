import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function PuzzlesPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'PUZZLE' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="PUZZLE"
      title="Puzzles"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Puzzles' }]}
      initialData={initialData}
    />
  );
}
