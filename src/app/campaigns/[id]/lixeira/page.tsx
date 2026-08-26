import { FileExplorer } from '@/components/FileExplorer';

export default function LixeiraPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="trash"
      title="Lixeira"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Lixeira' }]}
    />
  );
}
