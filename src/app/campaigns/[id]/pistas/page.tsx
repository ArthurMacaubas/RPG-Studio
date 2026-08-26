import { FileExplorer } from '@/components/FileExplorer';

export default function PistasPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="CLUE"
      title="Pistas"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Pistas' }]}
    />
  );
}
