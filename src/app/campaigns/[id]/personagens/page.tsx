import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function PersonagensPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'CHARACTER' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="CHARACTER"
      title="Personagens"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Personagens' }]}
      initialData={initialData}
    />
  );
}
