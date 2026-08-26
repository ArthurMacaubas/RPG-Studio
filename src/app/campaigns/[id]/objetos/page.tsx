import { FileExplorer } from '@/components/FileExplorer';

export default function ObjetosPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="OBJECT"
      title="Objetos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Objetos' }]}
    />
  );
}
