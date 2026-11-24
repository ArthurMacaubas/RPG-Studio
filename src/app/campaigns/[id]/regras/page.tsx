import { notFound } from 'next/navigation';
import { ThreeDetRulebook } from '@/components/ThreeDetRulebook';
import { campaignService } from '@/services/campaignService';
import { SYSTEM_LABELS } from '@/types';

export default async function ThreeDetRulesPage({ params }: { params: { id: string } }) {
  const campaign = await campaignService.get(params.id);
  if (!campaign) notFound();
  const isThreeDet = String(campaign.system) === 'THREEDET_VICTORY';
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}><p style={{ color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 12 }}>{SYSTEM_LABELS[campaign.system as keyof typeof SYSTEM_LABELS]}</p><h1>Compêndio de regras</h1><p style={{ color: 'var(--text-secondary)', maxWidth: 720 }}>Consulta rápida para a mesa, separada do conteúdo canônico e do tema visual de {campaign.name}.</p>{isThreeDet ? <ThreeDetRulebook /> : <p>Esta campanha não está configurada para 3DeT Victory.</p>}</main>;
}
