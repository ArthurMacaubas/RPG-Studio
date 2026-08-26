import { FileExplorer } from '@/components/FileExplorer';

export default function ThreatsPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="THREAT"
      title="Ameaças"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Ameaças' }]}
    />
  );
}
