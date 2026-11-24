import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';

const RelationshipGraphEditor = dynamic(() => import('./RelationshipGraphEditor'), {
  ssr: false,
  loading: () => <div style={{ padding: 'var(--space-6)', color: 'var(--color-text-muted)' }}>Carregando grafo de relações…</div>
});

export default async function RelationshipGraphPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role === 'PLAYER') redirect(`/campaigns/${params.id}/jogador`);
  return <RelationshipGraphEditor campaignId={params.id} userId={access.user.id} />;
}
