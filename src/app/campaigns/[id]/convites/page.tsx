'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { CampaignInviteItem, CampaignMemberItem, invitesApi, membersApi } from '@/lib/api';
import styles from './page.module.css';

export default function CampaignInvitesPage() {
  const campaignId = useParams<{ id: string }>()?.id ?? '';
  const [invites, setInvites] = useState<CampaignInviteItem[]>([]);
  const [members, setMembers] = useState<CampaignMemberItem[]>([]);
  const [email, setEmail] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('14');
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const pendingCount = useMemo(() => invites.filter((invite) => invite.status === 'PENDING').length, [invites]);

  const load = useCallback(async () => {
    try {
      const [inviteList, memberList] = await Promise.all([invitesApi.listForCampaign(campaignId), membersApi.list(campaignId)]);
      setInvites(inviteList);
      setMembers(memberList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os convites.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { if (campaignId) void load(); }, [campaignId, load]);

  async function createInvite(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await invitesApi.create(campaignId, { inviteeEmail: email, expiresInDays: Number(expiresInDays) });
      const link = `${window.location.origin}/convites/${result.token}`;
      setLastLink(link);
      setEmail('');
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Não foi possível criar o convite.');
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(inviteId: string) {
    setError(null);
    try {
      await invitesApi.revoke(campaignId, inviteId);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Não foi possível revogar o convite.');
    }
  }

  async function removeMember(userId: string, name: string) {
    if (!window.confirm(`Remover ${name} desta campanha? O jogador perderá o acesso e suas permissões individuais de arquivos serão revogadas.`)) return;
    setError(null);
    try {
      await membersApi.remove(campaignId, userId);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o jogador.');
    }
  }

  async function setAudience(userId: string, audience: CampaignMemberItem['audience']) {
    setError(null);
    try {
      await membersApi.setAudience(campaignId, userId, audience);
      await load();
    } catch (audienceError) {
      setError(audienceError instanceof Error ? audienceError.message : 'Não foi possível atualizar a audiência do jogador.');
    }
  }

  async function copyLink() {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>Membros da campanha</p><h1>Convites</h1><p className={styles.subtitle}>Envie acesso de jogador e controle convites desta campanha. {pendingCount} pendente(s).</p></div>
        <Link href={`/campaigns/${campaignId}`} className={styles.backLink}>Voltar à campanha</Link>
      </div>
      <section className={styles.panel}>
        <h2>Enviar convite</h2>
        <form onSubmit={createInvite} className={styles.form}>
          <label>E-mail do jogador<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Validade<select value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)}><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select></label>
          <button type="submit" disabled={submitting}>{submitting ? 'Gerando...' : 'Gerar convite'}</button>
        </form>
        {lastLink && <div className={styles.generated}><strong>Link pronto para compartilhar</strong><code>{lastLink}</code><button type="button" onClick={() => void copyLink()}>Copiar link</button></div>}
        {error && <p className={styles.error}>{error}</p>}
      </section>
      <section className={styles.panel}>
        <h2>Jogadores com acesso <span className={styles.sectionCount}>{members.length}</span></h2>
        {loading ? <p>Carregando...</p> : members.length === 0 ? <p>Nenhum jogador aceitou um convite ainda.</p> : <div className={styles.list}>{members.map((member) => <article key={member.id} className={styles.member}><div className={styles.memberInfo}><div className={styles.avatar}>{member.user.name.slice(0, 1).toUpperCase()}</div><div><strong>{member.user.name}</strong><span>{member.user.email} · entrou em {new Date(member.createdAt).toLocaleDateString('pt-BR')}</span></div></div><div className={styles.memberActions}><label className={styles.audienceLabel}>Audiência<select value={member.audience ?? ''} onChange={(event) => void setAudience(member.userId, event.target.value ? event.target.value as CampaignMemberItem['audience'] : null)}><option value="">Sem audiência</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option></select></label><button type="button" className={styles.dangerButton} onClick={() => void removeMember(member.userId, member.user.name)}>Remover jogador</button></div></article>)}</div>}
      </section>
      <section className={styles.panel}>
        <h2>Histórico</h2>
        {loading ? <p>Carregando...</p> : invites.length === 0 ? <p>Nenhum convite enviado.</p> : <div className={styles.list}>{invites.map((invite) => <article key={invite.id} className={styles.invite}><div><strong>{invite.inviteeEmail}</strong><span>Enviado em {new Date(invite.createdAt).toLocaleDateString('pt-BR')} · expira em {new Date(invite.expiresAt).toLocaleDateString('pt-BR')}</span></div><div className={styles.row}><span className={`${styles.status} ${styles[invite.status.toLowerCase()]}`}>{invite.status}</span>{invite.status === 'PENDING' && <button type="button" className={styles.dangerButton} onClick={() => void revoke(invite.id)}>Revogar</button>}</div></article>)}</div>}
      </section>
    </main>
  );
}
