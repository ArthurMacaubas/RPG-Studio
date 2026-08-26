import { FileExplorer } from '@/components/FileExplorer';

export default function ArquivosPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      title="Arquivos"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Arquivos' }]}
    />
  );
}
