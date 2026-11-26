import { notFound } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';
import { MapStudio } from '@/components/MapStudio';

export default async function MapDetailPage({ params }: { params: { id: string; fileId: string } }) {
  const access = await getCampaignAccess(params.id);
  if (!params.fileId) notFound();
  return <MapStudio campaignId={params.id} fileId={params.fileId} editable={access.role === 'OWNER'} />;
}
