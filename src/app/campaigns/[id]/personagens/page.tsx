import { FileExplorer } from '@/components/FileExplorer';

export default function PersonagensPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="CHARACTER"
      title="Personagens"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Personagens' }]}
    />
  );
}
