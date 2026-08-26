'use client';

import { useState } from 'react';
import type { SystemType } from '@/types';
import { SYSTEM_LABELS } from '@/types';
import { campaignsApi } from '@/lib/api';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const SYSTEMS: SystemType[] = ['ORDEM_PARANORMAL', 'DND_5E', 'CUSTOM'];

export default function NewCampaignPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [system, setSystem] = useState<SystemType>('CUSTOM');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const campaign = await campaignsApi.create({
        name,
        description: description || undefined,
        system
      });
      window.location.assign(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Nova campanha</h1>
        <p className={styles.subtitle}>Defina o essencial — você poderá ajustar tudo depois.</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">Nome da campanha</label>
          <input
            id="name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: O Enigma de Ravenhold"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">Descrição</label>
          <textarea
            id="description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Um breve resumo da campanha..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Sistema</label>
          <div className={styles.systemGrid}>
            {SYSTEMS.map((s) => (
              <div
                key={s}
                className={`${styles.systemOption} ${system === s ? styles.systemOptionActive : ''}`}
                onClick={() => setSystem(s)}
              >
                {SYSTEM_LABELS[s]}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={() => window.location.assign('/')}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={submitting || !name}>
            {submitting ? 'Criando...' : 'Criar campanha'}
          </button>
        </div>
      </form>
    </main>
  );
}
