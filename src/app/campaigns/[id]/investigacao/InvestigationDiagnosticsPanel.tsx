'use client';

import { AlertTriangle, CheckCircle2, CircleAlert, Info, Wrench, X } from 'lucide-react';
import type { CompilerIssue } from '@/types';
import styles from './investigationDiagnostics.module.css';

type InvestigationDiagnosticsPanelProps = {
  issues: CompilerIssue[];
  isOpen: boolean;
  onClose: () => void;
  onAction: (issue: CompilerIssue) => void;
};

const SEVERITY_LABELS: Record<CompilerIssue['severity'], string> = {
  error: 'Alta',
  warning: 'Atenção',
  suggestion: 'Informação'
};

function SeverityIcon({ severity }: { severity: CompilerIssue['severity'] }) {
  if (severity === 'error') return <CircleAlert size={15} aria-hidden="true" />;
  if (severity === 'warning') return <AlertTriangle size={15} aria-hidden="true" />;
  return <Info size={15} aria-hidden="true" />;
}

export default function InvestigationDiagnosticsPanel({ issues, isOpen, onClose, onAction }: InvestigationDiagnosticsPanelProps) {
  if (!isOpen) return null;

  return (
    <aside className={styles.panel} aria-label="Diagnósticos do Quadro" aria-live="polite">
      <div className={styles.header}>
        <div><p className={styles.eyebrow}><Wrench size={13} /> Leitura administrativa</p><h2>Diagnósticos do Quadro</h2></div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar diagnósticos"><X size={15} /></button>
      </div>
      <p className={styles.summary}>{issues.length ? `${issues.length} sugest${issues.length === 1 ? 'ão' : 'ões'} para revisão manual` : 'Nenhuma sugestão acionável no estado carregado.'}</p>
      {issues.length === 0 ? (
        <div className={styles.empty} role="status"><CheckCircle2 size={20} aria-hidden="true" /><strong>Quadro sem alertas calculáveis</strong><span>Os dados lidos nesta tela não produziram diagnósticos. Isso não substitui a revisão do Mestre.</span></div>
      ) : (
        <ol className={styles.list}>
          {issues.map((issue) => <li key={issue.id} className={`${styles.issue} ${styles[`severity${issue.severity}`]}`}>
            <div className={styles.issueHeader}><span className={styles.severity} title={`Severidade: ${SEVERITY_LABELS[issue.severity]}`}><SeverityIcon severity={issue.severity} /> <span>{SEVERITY_LABELS[issue.severity]}</span></span><code>{issue.code ?? issue.rule ?? 'DIAGNOSTICO'}</code></div>
            <strong className={styles.issueTitle}>{issue.message}</strong>
            {issue.explanation && <p>{issue.explanation}</p>}
            <div className={styles.issueFooter}><span>{issue.entityIds?.length ?? 0} elemento{issue.entityIds?.length === 1 ? '' : 's'} relacionado{issue.entityIds?.length === 1 ? '' : 's'}</span>{issue.action && <button type="button" onClick={() => onAction(issue)}><Wrench size={13} /> {issue.action.label}</button>}</div>
          </li>)}
        </ol>
      )}
      <p className={styles.note}>Diagnósticos são somente leitura. Nenhum item é criado, alterado, removido, reposicionado ou marcado como resolvido automaticamente.</p>
    </aside>
  );
}
