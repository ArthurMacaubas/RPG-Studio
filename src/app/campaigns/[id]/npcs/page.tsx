import { FileExplorer } from '@/components/FileExplorer';

export default function NpcsPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="NPC"
      title="NPCs"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'NPCs' }]}
    />
  );
}
