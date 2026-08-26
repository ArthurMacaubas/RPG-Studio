import { FileExplorer } from '@/components/FileExplorer';

export default function EventosPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="EVENT"
      title="Eventos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Eventos' }]}
    />
  );
}
