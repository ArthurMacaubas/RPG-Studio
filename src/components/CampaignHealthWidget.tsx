'use client';

import { useState } from 'react';
import { campaignHealthApi } from '@/lib/api';
import type { CampaignHealth } from '@/types';
import styles from './CampaignHealthWidget.module.css';

const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(health: CampaignHealth) {
  if (health.errors.length > 0) return 'var(--color-danger)';
  if (health.warnings.length > 0) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function CampaignHealthWidget({ campaignId, health }: { campaignId: string; health: CampaignHealth }) {
  const [currentHealth, setCurrentHealth] = useState(health);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const offset = CIRCUMFERENCE - (currentHealth.score / 100) * CIRCUMFERENCE;
  const allIssues = [...currentHealth.errors, ...currentHealth.warnings, ...currentHealth.suggestions].slice(0, 6);
  const simulation = currentHealth.simulation;

  async function runSimulation() {
    setIsSimulating(true);
    setSimulationError(null);
    try {
      setCurrentHealth(await campaignHealthApi.simulate(campaignId));
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : 'Não foi possível executar a simulação.');
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.label}>
          <span
            className={`${styles.dot} ${
              currentHealth.errors.length > 0
                ? styles.dotError
                : currentHealth.warnings.length > 0
                  ? styles.dotWarn
                  : ''
            }`}
          />
          Compilador V6
        </div>
        <button className={styles.simulateButton} onClick={runSimulation} disabled={isSimulating}>
          {isSimulating ? 'Simulando...' : 'Simular grafo'}
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.ringWrap}>
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="var(--color-border)" strokeWidth="6" />
            <circle
              cx="38"
              cy="38"
              r={RADIUS}
              fill="none"
              stroke={ringColor(currentHealth)}
              strokeWidth="6"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 38 38)"
            />
          </svg>
          <div className={styles.ringLabel}>{currentHealth.score}%</div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statRow}><span className={styles.statCount}>{currentHealth.errors.length}</span> erros</div>
          <div className={styles.statRow}><span className={styles.statCount}>{currentHealth.warnings.length}</span> avisos</div>
          <div className={styles.statRow}><span className={styles.statCount}>{currentHealth.suggestions.length}</span> sugestões</div>
        </div>
      </div>

      {simulation && (
        <div className={styles.simulationSummary}>
          <strong>{simulation.official.valid ? 'Caminho oficial encontrado' : 'Caminho oficial bloqueado'}</strong>
          <span>{simulation.official.paths.length} caminho(s) válido(s) · {simulation.official.deadEnds.length} beco(s) sem saída</span>
          {simulation.official.paths[0] && <small>{simulation.official.paths[0].fileNames.join(' → ')}</small>}
        </div>
      )}
      {simulationError && <div className={styles.simulationError}>{simulationError}</div>}

      {allIssues.length > 0 ? (
        <div className={styles.issueList}>
          {allIssues.map((issue) => (
            <div key={issue.id} className={styles.issueRow}>
              <span
                className={`${styles.issueTag} ${
                  issue.severity === 'error'
                    ? styles.tagError
                    : issue.severity === 'warning'
                      ? styles.tagWarning
                      : styles.tagSuggestion
                }`}
              >
                {issue.severity === 'error' ? 'erro' : issue.severity === 'warning' ? 'aviso' : 'sugestão'}
              </span>
              <div className={styles.issueContent}>
                <strong>{issue.message}</strong>
                {issue.rule && <small>{issue.rule}</small>}
                {issue.explanation && <span>{issue.explanation}</span>}
                {issue.action && <a href={issue.action.href}>{issue.action.label}</a>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.clean}>Nenhum problema encontrado. Campanha saudável.</div>
      )}
    </div>
  );
}
