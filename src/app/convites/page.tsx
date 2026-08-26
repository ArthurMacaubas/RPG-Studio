'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authApi, ReceivedInvite, invitesApi } from '@/lib/api';
import styles from './invite.module.css';

export const dynamic = 'force-dynamic';

export default function ReceivedInvitesPage() {
  const [invites, setInvites] = useState<ReceivedInvite[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function load() {
    try {
      const session = await authApi.me();
      setAuthenticated(Boolean(session.user));
      if (session.user) setInvites(await invitesApi.listReceived());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar seus convites.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function accept(invite: ReceivedInvite) {
    setAcceptingId(invite.id);
    setError(null);
    try {
      const result = await invitesApi.accept(invite.id);
      window.location.href = `/campaigns/${result.campaign.id}`;
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Não foi possível aceitar o convite.');
    } finally {
      setAcceptingId(null);
    }
  }

  if (authenticated === false) {
    return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>Convites</p><h1>Entre para ver seus convites</h1><p className={styles.description}>Faça login com o e-mail que recebeu o convite para participar de uma campanha.</p><div className={styles.actions}><Link href={'/login' as never} className={styles.primaryButton}>Entrar</Link><Link href={'/registro' as never} className={styles.secondaryButton}>Criar conta</Link></div></section></main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Área do jogador</p>
        <h1>Convites recebidos</h1>
        <p className={styles.description}>Campanhas em que você pode entrar como jogador.</p>
        {error && <p className={styles.error}>{error}</p>}
        {authenticated === null ? <p>Carregando...</p> : invites.length === 0 ? <p>Nenhum convite pendente no momento.</p> : (
          <div className={styles.details}>
            {invites.map((invite) => (
              <div key={invite.id}>
                <strong>{invite.campaign.name}</strong>
                <p>{invite.inviter.name} enviou um convite para {invite.inviteeEmail}.</p>
                <div className={styles.actions}><button className={styles.primaryButton} onClick={() => void accept(invite)} disabled={acceptingId === invite.id}>{acceptingId === invite.id ? 'Aceitando...' : 'Aceitar'}</button><span className={styles.secondaryButton}>Convite pendente</span></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
