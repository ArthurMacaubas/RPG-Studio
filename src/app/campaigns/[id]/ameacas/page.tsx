import { FileExplorer } from '@/components/FileExplorer';
import { getFileExplorerInitialData } from '@/services/fileExplorerService';

export default async function ThreatsPage({ params }: { params: { id: string } }) {
  const initialData = await getFileExplorerInitialData({ campaignId: params.id, scope: 'active', fixedType: 'THREAT' });
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="THREAT"
      title="Ameaças"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Ameaças' }]}
      initialData={initialData}
    />
  );
}
