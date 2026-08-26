import { FileExplorer } from '@/components/FileExplorer';

export default function PuzzlesPage({ params }: { params: { id: string } }) {
  return (
    <FileExplorer
      campaignId={params.id}
      scope="active"
      fixedType="PUZZLE"
      title="Puzzles"
      breadcrumb={[{ label: 'Campanha', href: `/campaigns/${params.id}` }, { label: 'Puzzles' }]}
    />
  );
}
