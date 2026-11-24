import { redirect } from 'next/navigation';
import { getCampaignAccess } from '@/lib/access';
import { AppearanceEditor } from '@/components/AppearanceEditor';
import styles from './page.module.css';

export default async function AparenciaPage({ params }: { params: { id: string } }) {
  const access = await getCampaignAccess(params.id);
  if (access.role !== 'OWNER') redirect(`/campaigns/${params.id}/jogador`);
  return <main className={styles.page}>
    <header className={styles.header}><span>Configurações da campanha</span><h1>Aparência</h1><p>Crie identidades visuais isoladas, revise o rascunho e publique apenas quando estiver pronto.</p></header>
    <AppearanceEditor campaignId={params.id} />
  </main>;
}
