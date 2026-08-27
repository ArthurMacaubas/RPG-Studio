'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import { briefingApi, type CampaignBriefingAdmin } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/ToastProvider';
import styles from './CampaignBriefingEditor.module.css';

const MAX_BODY_LENGTH = 20000;

export function CampaignBriefingEditor({ campaignId }: { campaignId: string }) {
  const [briefing, setBriefing] = useState<CampaignBriefingAdmin | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    briefingApi.get(campaignId).then(({ briefing: current }) => {
      if (!active) return;
      setBriefing(current);
      setTitle(current?.title ?? '');
      setBody(current?.body ?? '');
    }).catch((error) => {
      if (active) toast({ tone: 'error', title: 'Briefing indisponível', message: error instanceof Error ? error.message : 'Tente novamente.' });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [campaignId, toast]);

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const saved = await briefingApi.save(campaignId, { title, body });
      setBriefing(saved);
      setTitle(saved.title);
      setBody(saved.body);
      toast({ tone: 'success', title: 'Briefing salvo', message: saved.isPublished ? 'A versão publicada foi atualizada.' : 'O briefing continua privado até você publicá-lo.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível salvar o briefing', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished() {
    if (!briefing) return;
    setSaving(true);
    try {
      const updated = await briefingApi.setPublished(campaignId, !briefing.isPublished);
      setBriefing(updated);
      toast({ tone: updated.isPublished ? 'success' : 'info', title: updated.isPublished ? 'Briefing publicado' : 'Briefing retirado', message: updated.isPublished ? 'Jogadores autorizados já podem receber esta mensagem.' : 'O briefing voltou a ser privado.' });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível alterar a publicação', message: error instanceof Error ? error.message : 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className={styles.panel} eyebrow="Briefing público" title="Mensagem curada para jogadores" action={briefing ? <Badge tone={briefing.isPublished ? 'success' : 'neutral'}>{briefing.isPublished ? 'Publicado' : 'Rascunho'}</Badge> : undefined}>
      <p className={styles.hint}>Escreva somente o contexto que você deseja compartilhar. Sessões, objetivos, hipóteses, evidências e dados administrativos não são incluídos automaticamente.</p>
      {loading ? <p className={styles.loading}>Carregando briefing…</p> : <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label className={styles.field}><span>Título</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ex.: Antes da próxima sessão" required /></label>
        <label className={styles.field}><span>Mensagem</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={MAX_BODY_LENGTH} rows={6} placeholder="Contexto, avisos ou informações que os jogadores já podem conhecer." required /></label>
        <div className={styles.footer}><small>{body.length.toLocaleString('pt-BR')} / {MAX_BODY_LENGTH.toLocaleString('pt-BR')} caracteres</small><div className={styles.actions}><Button type="submit" size="sm" icon={<Save size={14} />} disabled={saving || !title.trim() || !body.trim()}>{saving ? 'Salvando…' : 'Salvar rascunho'}</Button>{briefing && <Button type="button" variant={briefing.isPublished ? 'ghost' : 'secondary'} size="sm" icon={briefing.isPublished ? <EyeOff size={14} /> : <Eye size={14} />} onClick={() => void togglePublished()} disabled={saving}>{briefing.isPublished ? 'Retirar publicação' : 'Publicar briefing'}</Button>}</div></div>
      </form>}
    </Panel>
  );
}
