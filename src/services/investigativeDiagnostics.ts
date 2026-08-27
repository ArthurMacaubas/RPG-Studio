import type { CompilerIssue, EvidenceStance, FileType, HypothesisStatus } from '@/types';

type DiagnosticFile = {
  id: string;
  name: string;
  type: FileType | string;
  isArchived: boolean;
  isTrashed: boolean;
  data?: unknown;
};

type DiagnosticEvidence = {
  id: string;
  fileId: string;
  stance: EvidenceStance;
  file: Pick<DiagnosticFile, 'id' | 'name' | 'type' | 'isArchived' | 'isTrashed'>;
};

type DiagnosticHypothesis = {
  id: string;
  title: string;
  status: HypothesisStatus;
  evidence: DiagnosticEvidence[];
};

type DiagnosticRelationship = {
  id: string;
  fromId: string;
  toId: string;
  importance: 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'OPTIONAL';
  from: Pick<DiagnosticFile, 'id' | 'name'>;
  to: Pick<DiagnosticFile, 'id' | 'name'>;
};

type DiagnosticBoardView = {
  id: string;
  name: string;
  snapshot: unknown;
};

export type InvestigativeDiagnosticsInput = {
  campaignId: string;
  files: DiagnosticFile[];
  hypotheses: DiagnosticHypothesis[];
  importantRelationships: DiagnosticRelationship[];
  activeBoardFileIds: Set<string>;
  boardPins: Array<{ id: string }>;
  boardGroups: Array<{ id: string }>;
  boardViews: DiagnosticBoardView[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asIdArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function action(campaignId: string, label: string, suffix = '/investigacao') {
  return { label, href: `/campaigns/${campaignId}${suffix}` };
}

function diagnostic(
  rule: string,
  severity: CompilerIssue['severity'],
  entityKey: string,
  message: string,
  explanation: string,
  entityIds: string[],
  correction: { label: string; href: string }
): CompilerIssue {
  return {
    id: `diagnostic-${rule.toLowerCase()}-${entityKey}`,
    code: rule,
    rule,
    severity,
    message,
    explanation,
    entityIds,
    fileId: entityIds[0],
    action: correction
  };
}

function isCriticalClue(file: DiagnosticFile) {
  if (file.type !== 'CLUE') return false;
  const data = asRecord(file.data);
  return data.critical === true || data.importance === 'CRITICAL' || data.priority === 'CRITICAL';
}

function referenceIds(snapshot: unknown, key: 'pinIds' | 'groupIds') {
  return asIdArray(asRecord(snapshot)[key]);
}

export function computeInvestigativeDiagnostics(input: InvestigativeDiagnosticsInput): CompilerIssue[] {
  const issues: CompilerIssue[] = [];
  const hypothesisByFileId = new Set(input.hypotheses.flatMap((hypothesis) => hypothesis.evidence.map((evidence) => evidence.fileId)));
  const pinIds = new Set(input.boardPins.map((pin) => pin.id));
  const groupIds = new Set(input.boardGroups.map((group) => group.id));

  for (const hypothesis of [...input.hypotheses].sort((a, b) => a.id.localeCompare(b.id))) {
    const evidence = [...hypothesis.evidence].sort((a, b) => a.id.localeCompare(b.id));
    const supports = evidence.filter((item) => item.stance === 'SUPPORTS');
    const contradicts = evidence.filter((item) => item.stance === 'CONTRADICTS');

    if (hypothesis.status === 'OPEN' && evidence.length === 0) {
      issues.push(diagnostic(
        'HYPOTHESIS_WITHOUT_EVIDENCE',
        'warning',
        hypothesis.id,
        `A hipótese "${hypothesis.title}" está aberta sem evidências vinculadas.`,
        'Uma hipótese aberta precisa de evidência registrada ou deve ser encerrada pelo Mestre.',
        [hypothesis.id],
        action(input.campaignId, 'Abrir hipóteses')
      ));
    }

    if (hypothesis.status === 'SUPPORTED' && supports.length === 0) {
      issues.push(diagnostic(
        'SUPPORTED_HYPOTHESIS_WITHOUT_SUPPORT',
        'error',
        hypothesis.id,
        `A hipótese "${hypothesis.title}" está sustentada sem evidência que sustente a conclusão.`,
        'O estado sustentado exige ao menos uma evidência com stance SUPPORTS.',
        [hypothesis.id],
        action(input.campaignId, 'Abrir hipóteses')
      ));
    }

    if (hypothesis.status === 'REFUTED' && contradicts.length === 0) {
      issues.push(diagnostic(
        'REFUTED_HYPOTHESIS_WITHOUT_CONTRADICTION',
        'warning',
        hypothesis.id,
        `A hipótese "${hypothesis.title}" está refutada sem evidência contrária vinculada.`,
        'O estado refutado exige ao menos uma evidência com stance CONTRADICTS.',
        [hypothesis.id],
        action(input.campaignId, 'Abrir hipóteses')
      ));
    }

    if (contradicts.length > 0) {
      issues.push(diagnostic(
        'HYPOTHESIS_WITH_CONTRADICTORY_EVIDENCE',
        'warning',
        hypothesis.id,
        `A hipótese "${hypothesis.title}" possui evidências que sustentam e contradizem a mesma conclusão.`,
        'O Mestre deve revisar a hipótese e explicitar como a evidência contraditória será tratada.',
        [hypothesis.id, ...evidence.map((item) => item.fileId)],
        action(input.campaignId, 'Revisar hipóteses')
      ));
    }

    for (const item of evidence) {
      if (!item.file.isArchived && !item.file.isTrashed) continue;
      const state = item.file.isTrashed ? 'na lixeira' : 'arquivado';
      issues.push(diagnostic(
        'EVIDENCE_FILE_UNAVAILABLE',
        'warning',
        item.id,
        `A evidência "${item.file.name}" está ${state} e não está disponível no quadro ativo.`,
        'Evidências apontando para arquivos arquivados ou na lixeira precisam ser revisadas ou substituídas.',
        [item.id, item.fileId],
        action(input.campaignId, 'Abrir hipóteses')
      ));
    }
  }

  for (const file of [...input.files].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!isCriticalClue(file) || file.isArchived || file.isTrashed || hypothesisByFileId.has(file.id)) continue;
    issues.push(diagnostic(
      'CRITICAL_CLUE_WITHOUT_HYPOTHESIS',
      'warning',
      file.id,
      `A pista crítica "${file.name}" não está vinculada a nenhuma hipótese.`,
      'Pistas críticas devem ser avaliadas em uma hipótese ou ter sua criticidade revisada pelo Mestre.',
      [file.id],
      action(input.campaignId, 'Abrir quadro')
    ));
  }

  for (const relationship of [...input.importantRelationships].sort((a, b) => a.id.localeCompare(b.id))) {
    if (input.activeBoardFileIds.has(relationship.fromId) && input.activeBoardFileIds.has(relationship.toId)) continue;
    issues.push(diagnostic(
      'IMPORTANT_RELATIONSHIP_OUTSIDE_ACTIVE_BOARD',
      'warning',
      relationship.id,
      `A relação importante entre "${relationship.from.name}" e "${relationship.to.name}" não está inteira no quadro ativo.`,
      'O diagnóstico apenas aponta a ausência de um dos nós; não cria, move ou altera a relação oficial.',
      [relationship.id, relationship.fromId, relationship.toId],
      action(input.campaignId, 'Abrir quadro')
    ));
  }

  for (const view of [...input.boardViews].sort((a, b) => a.id.localeCompare(b.id))) {
    const snapshot = asRecord(view.snapshot);
    const missingPins = referenceIds(snapshot, 'pinIds').filter((id) => !pinIds.has(id));
    const missingGroups = referenceIds(snapshot, 'groupIds').filter((id) => !groupIds.has(id));
    const missing = [...missingPins, ...missingGroups];
    if (missing.length === 0) continue;
    issues.push(diagnostic(
      'BOARD_ANNOTATION_REFERENCE_INVALID',
      'error',
      view.id,
      `A vista "${view.name}" contém referência de pin ou grupo que não existe mais.`,
      'A vista deve ser atualizada para remover referências ausentes; o diagnóstico não cria anotações substitutas.',
      [view.id, ...missing],
      action(input.campaignId, 'Abrir vistas salvas')
    ));
  }

  return issues.sort((a, b) => {
    const ruleOrder = (a.rule ?? '').localeCompare(b.rule ?? '');
    if (ruleOrder !== 0) return ruleOrder;
    return a.id.localeCompare(b.id);
  });
}

export function diagnosticFixtureFile(id: string, name: string, data: unknown = {}): DiagnosticFile {
  return { id, name, type: 'CLUE', isArchived: false, isTrashed: false, data };
}
