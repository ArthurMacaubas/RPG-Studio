import { FileExplorer } from '@/components/FileExplorer';

export default function LocaisPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="LOCATION"
      title="Locais"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Locais' }]}
    />
  );
}
