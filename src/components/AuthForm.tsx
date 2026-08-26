'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { authApi } from '@/lib/api';
import styles from './AuthForm.module.css';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) {
        await authApi.register({ name, email, password });
      } else {
        await authApi.login({ email, password });
      }
      router.push('/');
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>RPG Campaign Studio</div>
        <h1>{isRegister ? 'Criar sua conta' : 'Entrar na sua mesa'}</h1>
        <p className={styles.subtitle}>
          {isRegister ? 'Crie campanhas próprias e participe das campanhas dos seus amigos.' : 'Acesse suas campanhas e convites de jogador.'}
        </p>
        <form onSubmit={submit} className={styles.form}>
          {isRegister && (
            <label>
              Nome
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required minLength={2} maxLength={80} />
            </label>
          )}
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : 1} />
          </label>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <button type="submit" disabled={submitting}>{submitting ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}</button>
        </form>
        <p className={styles.switcher}>
          {isRegister ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}{' '}
          <Link href={(isRegister ? '/login' : '/registro') as never}>{isRegister ? 'Entrar' : 'Cadastrar-se'}</Link>
        </p>
      </section>
    </main>
  );
}
