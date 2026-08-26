import { FileExplorer } from '@/components/FileExplorer';

export default function ArquivadosPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="archived"
      title="Arquivados"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Arquivados' }]}
    />
  );
}
