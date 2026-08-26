import { FileExplorer } from '@/components/FileExplorer';

export default function DocumentosPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="DOCUMENT"
      title="Documentos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Documentos' }]}
    />
  );
}
