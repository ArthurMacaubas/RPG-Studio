import { MediaLibrary } from '@/components/MediaLibrary';

export default function MediaPage({ params }: { params: { id: string } }) {
  return <MediaLibrary campaignId={params.id} />;
}
