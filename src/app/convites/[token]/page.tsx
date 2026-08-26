'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi, InvitePreview, invitesApi } from '@/lib/api';
import styles from '../invite.module.css';

export default function InvitePreviewPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token ?? '';
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([invitesApi.preview(token), authApi.me()])
      .then(([invite, session]) => {
        setPreview(invite);
        setAuthenticated(Boolean(session.user));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Convite indisponível.'));
  }, [token]);

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await invitesApi.accept(token);
      router.push(`/campaigns/${result.campaign.id}` as never);
      router.refresh();
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : 'Não foi possível aceitar o convite.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>Convite de campanha</p><h1>Convite indisponível</h1><p className={styles.error}>{error}</p><Link href={'/' as never} className={styles.secondaryButton}>Voltar ao início</Link></section></main>;
  }

  if (!preview) {
    return <main className={styles.page}><section className={styles.card}><p>Carregando convite...</p></section></main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Convite para campanha</p>
        <h1>{preview.campaign.name}</h1>
        <p className={styles.description}>{preview.campaign.description || 'Uma nova aventura espera por você.'}</p>
        <dl className={styles.details}>
          <div><dt>Mestre</dt><dd>{preview.inviter.name} · {preview.inviter.email}</dd></div>
          <div><dt>Convite enviado para</dt><dd>{preview.inviteeEmail}</dd></div>
          <div><dt>Expira em</dt><dd>{new Date(preview.expiresAt).toLocaleDateString('pt-BR')}</dd></div>
        </dl>
        {authenticated === false ? (
          <div className={styles.notice}>
            Entre ou crie uma conta com o e-mail convidado para aceitar este convite.
            <div className={styles.actions}><Link href={'/login' as never} className={styles.primaryButton}>Entrar</Link><Link href={'/registro' as never} className={styles.secondaryButton}>Criar conta</Link></div>
          </div>
        ) : (
          <button className={styles.primaryButton} onClick={accept} disabled={submitting}>{submitting ? 'Aceitando...' : 'Aceitar convite'}</button>
        )}
      </section>
    </main>
  );
}
