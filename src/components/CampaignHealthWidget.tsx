'use client';

import { useEffect, useState } from 'react';
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

export function CampaignHealthWidget({ campaignId, userId, health }: { campaignId: string; userId: string; health: CampaignHealth | null }) {
  const storageKey = `rpg-studio:compiler-v6:${campaignId}:${userId}`;
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentHealth, setCurrentHealth] = useState<CampaignHealth | null>(health);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const offset = currentHealth ? CIRCUMFERENCE - (currentHealth.score / 100) * CIRCUMFERENCE : CIRCUMFERENCE;
  const allIssues = currentHealth ? [...currentHealth.errors, ...currentHealth.warnings, ...currentHealth.suggestions].slice(0, 6) : [];
  const simulation = currentHealth?.simulation;

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const expanded = stored === 'open';
    setIsExpanded(expanded);
    if (expanded && !health) void loadHealth();
  // The preference is intentionally read once per campaign mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  async function loadHealth() {
    setIsLoading(true);
    setSimulationError(null);
    try {
      setCurrentHealth(await campaignHealthApi.get(campaignId));
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : 'Não foi possível carregar o compilador.');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleExpanded() {
    const next = !isExpanded;
    setIsExpanded(next);
    window.localStorage.setItem(storageKey, next ? 'open' : 'closed');
    if (next && !currentHealth) void loadHealth();
  }

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
              currentHealth?.errors.length
                ? styles.dotError
                : currentHealth?.warnings.length
                  ? styles.dotWarn
                  : ''
            }`}
          />
          <span id={`compiler-v6-title-${campaignId}`}>Compilador V6</span>
        </div>
        <button className={styles.toggleButton} onClick={toggleExpanded} aria-expanded={isExpanded} aria-controls={`compiler-v6-panel-${campaignId}`}>
          {isExpanded ? 'Recolher' : 'Exibir compilador'}
        </button>
      </div>

      {!isExpanded && <p className={styles.collapsedHint}>Painel recolhido. O diagnóstico só é carregado quando você o exibe.</p>}

      {isExpanded && <div id={`compiler-v6-panel-${campaignId}`} role="region" aria-labelledby={`compiler-v6-title-${campaignId}`}>
      {isLoading && <div className={styles.loading}>Carregando diagnóstico da campanha…</div>}

      {currentHealth && <div className={styles.body}>
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
      </div>}

      {simulation && (
        <div className={styles.simulationSummary}>
          <strong>{simulation.official.valid ? 'Caminho oficial encontrado' : 'Caminho oficial bloqueado'}</strong>
          <span>{simulation.official.paths.length} caminho(s) válido(s) · {simulation.official.deadEnds.length} beco(s) sem saída</span>
          {simulation.official.paths[0] && <small>{simulation.official.paths[0].fileNames.join(' → ')}</small>}
        </div>
      )}
      {simulationError && <div className={styles.simulationError}>{simulationError}</div>}

      {currentHealth && allIssues.length > 0 ? (
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
      ) : currentHealth ? (
        <div className={styles.clean}>Nenhum problema encontrado. Campanha saudável.</div>
      ) : null}
      {currentHealth && <button className={styles.simulateButton} onClick={runSimulation} disabled={isSimulating || isLoading}>
        {isSimulating ? 'Simulando...' : 'Simular grafo'}
      </button>}
      </div>}
    </div>
  );
}
