import { FileExplorer } from '@/components/FileExplorer';

export default function MapaPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="MAP"
      title="Mapa"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Mapa' }]}
    />
  );
}
