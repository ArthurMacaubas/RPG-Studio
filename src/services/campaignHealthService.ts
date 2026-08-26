import { prisma } from '@/lib/prisma';
import { assertCampaignRole } from '@/lib/access';
import type {
  CampaignHealth,
  CompilerIssue,
  FileType,
  GraphPath,
  GraphSimulation,
  GraphSimulationBranch,
  GraphSimulationIssue
} from '@/types';
import { computeInvestigativeDiagnostics } from '@/services/investigativeDiagnostics';

interface GraphNodeInput {
  id: string;
  name: string;
  type: FileType | string;
  data?: unknown;
}

interface GraphEdgeInput {
  fromId: string;
  toId: string;
  label?: string | null;
}

interface GraphTraversalResult {
  paths: GraphPath[];
  reachableFinals: string[];
  deadEnds: string[];
  blockedNodes: string[];
  issues: GraphSimulationIssue[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isTruthy(value: unknown) {
  return value === true || value === 'true' || value === 1;
}

function nodeIsBlocked(node: GraphNodeInput) {
  const data = asRecord(node.data);
  return isTruthy(data.blocked) || isTruthy(data.isBlocked) || isTruthy(data.inaccessible);
}

function nodeIsStart(node: GraphNodeInput) {
  const data = asRecord(node.data);
  return isTruthy(data.isStart) || isTruthy(data.start) || isTruthy(data.entry);
}

function nodeIsFinal(node: GraphNodeInput) {
  const data = asRecord(node.data);
  return isTruthy(data.isFinal) || isTruthy(data.final) || isTruthy(data.ending) || isTruthy(data.isEnding);
}

function makeIssue(
  id: string,
  severity: GraphSimulationIssue['severity'],
  message: string,
  fileIds: string[]
): GraphSimulationIssue {
  return { id, severity, message, fileIds };
}

function traverseFromStart(
  startId: string,
  nodeById: Map<string, GraphNodeInput>,
  outgoing: Map<string, string[]>,
  finalIds: Set<string>,
  blockedIds: Set<string>
): GraphTraversalResult {
  const paths: GraphPath[] = [];
  const reachableFinals = new Set<string>();
  const deadEnds = new Set<string>();
  const issues: GraphSimulationIssue[] = [];
  const seenStates = new Set<string>();
  const maxDepth = Math.max(nodeById.size + 1, 2);

  function walk(currentId: string, path: string[], depth: number) {
    const state = `${currentId}:${path.join('>')}`;
    const node = nodeById.get(currentId);
    if (!node) {
      issues.push(makeIssue(`missing-node-${currentId}`, 'error', `O caminho referencia a entidade inexistente "${currentId}".`, path));
      return;
    }
    if (blockedIds.has(currentId)) {
      issues.push(makeIssue(`blocked-node-${currentId}`, 'error', `O caminho é bloqueado por "${node.name}".`, [...path, currentId]));
      return;
    }
    if (path.includes(currentId)) {
      issues.push(makeIssue(`cycle-${path.join('-')}`, 'error', `O caminho entra em um ciclo em "${node.name}".`, [...path, currentId]));
      return;
    }
    if (depth > maxDepth || seenStates.has(state)) {
      issues.push(makeIssue(`depth-${currentId}`, 'error', `O caminho excede o limite de simulação próximo a "${node.name}".`, [...path, currentId]));
      return;
    }
    seenStates.add(state);
    const nextPath = [...path, currentId];
    const nextIds = (outgoing.get(currentId) ?? []).filter((id) => nodeById.has(id));

    if (finalIds.has(currentId)) {
      reachableFinals.add(currentId);
      paths.push({
        fileIds: nextPath,
        fileNames: nextPath.map((id) => nodeById.get(id)?.name ?? id)
      });
      return;
    }
    if (nextIds.length === 0) {
      deadEnds.add(currentId);
      issues.push(makeIssue(`dead-end-${currentId}`, 'error', `O caminho termina sem final em "${node.name}".`, nextPath));
      return;
    }
    for (const nextId of nextIds) walk(nextId, nextPath, depth + 1);
  }

  walk(startId, [], 0);
  return { paths, reachableFinals: [...reachableFinals], deadEnds: [...deadEnds], blockedNodes: [...blockedIds], issues };
}

export function simulateCampaignGraph(nodes: GraphNodeInput[], edges: GraphEdgeInput[]): GraphSimulationBranch {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const issues: GraphSimulationIssue[] = [];
  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }
  for (const edge of edges) {
    if (!nodeById.has(edge.fromId) || !nodeById.has(edge.toId)) {
      issues.push(makeIssue(`broken-edge-${edge.fromId}-${edge.toId}`, 'error', `A conexão ${edge.fromId} → ${edge.toId} referencia uma entidade inexistente.`, [edge.fromId, edge.toId]));
      continue;
    }
    outgoing.get(edge.fromId)?.push(edge.toId);
    incoming.get(edge.toId)?.push(edge.fromId);
  }

  const blockedIds = new Set(nodes.filter(nodeIsBlocked).map((node) => node.id));
  for (const blockedId of blockedIds) {
    const node = nodeById.get(blockedId);
    if (node) issues.push(makeIssue(`blocked-${blockedId}`, 'warning', `"${node.name}" está marcado como bloqueado.`, [blockedId]));
  }

  const explicitStarts = nodes.filter(nodeIsStart).map((node) => node.id);
  const explicitFinals = nodes.filter(nodeIsFinal).map((node) => node.id);
  const starts = explicitStarts.length > 0
    ? explicitStarts
    : nodes.filter((node) => (incoming.get(node.id) ?? []).length === 0).map((node) => node.id);
  const finals = explicitFinals.length > 0
    ? explicitFinals
    : nodes.filter((node) => (outgoing.get(node.id) ?? []).length === 0).map((node) => node.id);

  if (starts.length === 0 && nodes.length > 0) {
    issues.push(makeIssue('no-start', 'error', 'Não foi possível encontrar um ponto inicial para a campanha.', []));
  }
  if (finals.length === 0 && nodes.length > 0) {
    issues.push(makeIssue('no-final', 'error', 'Não foi possível encontrar um final para a campanha.', []));
  }

  const traversalResults = starts.map((startId) => traverseFromStart(startId, nodeById, outgoing, new Set(finals), blockedIds));
  const paths = traversalResults.flatMap((result) => result.paths);
  const reachableFinals = [...new Set(traversalResults.flatMap((result) => result.reachableFinals))];
  const deadEnds = [...new Set(traversalResults.flatMap((result) => result.deadEnds))];
  const allTraversalIssues = traversalResults.flatMap((result) => result.issues);
  const uniqueIssues = [...new Map([...issues, ...allTraversalIssues].map((issue) => [issue.id, issue])).values()];
  const valid = nodes.length === 0 || (starts.length > 0 && finals.length > 0 && paths.length > 0 && !uniqueIssues.some((issue) => issue.severity === 'error'));

  return {
    valid,
    starts,
    finals,
    reachableFinals,
    deadEnds,
    blockedNodes: [...blockedIds],
    paths,
    issues: uniqueIssues
  };
}

function collectReferenceValues(value: unknown, key = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectReferenceValues(item, key));
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return Object.entries(record).flatMap(([childKey, childValue]) => {
    const normalizedKey = childKey.toLowerCase();
    const isReferenceKey = normalizedKey === 'fileid' || normalizedKey === 'relatedfileid' || normalizedKey === 'targetfileid' || normalizedKey === 'requiresfileid' || normalizedKey.endsWith('fileids');
    if (isReferenceKey) return asStringArray(childValue);
    return collectReferenceValues(childValue, childKey);
  });
}

function addIssue(target: CompilerIssue[], issue: CompilerIssue) {
  if (!target.some((existing) => existing.id === issue.id)) target.push(issue);
}

export async function computeCampaignHealth(campaignId: string): Promise<CampaignHealth> {
  await assertCampaignRole(campaignId, 'OWNER');
  const errors: CompilerIssue[] = [];
  const warnings: CompilerIssue[] = [];
  const suggestions: CompilerIssue[] = [];

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, system: true } });
  if (!campaign) throw new Error('Campanha não encontrada.');

  const files = await prisma.campaignFile.findMany({
    where: { campaignId, isArchived: false, isTrashed: false },
    include: {
      relationshipsFrom: { include: { to: true, type: true } },
      relationshipsTo: { include: { from: true } },
      timelineLinks: true
    }
  });
  const sessions = await prisma.session.findMany({ where: { campaignId }, include: { files: true } });
  const timelineEvents = await prisma.timelineEvent.findMany({ where: { campaignId }, orderBy: [{ happenedAt: 'asc' }, { order: 'asc' }] });
  const board = await prisma.boardNode.findMany({
    where: { campaignId, file: { isArchived: false, isTrashed: false } },
    include: { file: true, edgesFrom: true, edgesTo: true }
  });
  const [allFiles, hypotheses, importantRelationships, boardPins, boardGroups, boardViews] = await Promise.all([
    prisma.campaignFile.findMany({
      where: { campaignId },
      select: { id: true, name: true, type: true, isArchived: true, isTrashed: true, data: true }
    }),
    prisma.investigationHypothesis.findMany({
      where: { campaignId },
      select: {
        id: true,
        title: true,
        status: true,
        evidence: {
          select: {
            id: true,
            fileId: true,
            stance: true,
            file: { select: { id: true, name: true, type: true, isArchived: true, isTrashed: true } }
          }
        }
      }
    }),
    prisma.relationship.findMany({
      where: { campaignId, importance: 'IMPORTANT' },
      select: {
        id: true,
        fromId: true,
        toId: true,
        importance: true,
        from: { select: { id: true, name: true } },
        to: { select: { id: true, name: true } }
      }
    }),
    prisma.investigationBoardPin.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.investigationBoardGroup.findMany({ where: { campaignId }, select: { id: true } }),
    prisma.investigationBoardView.findMany({ where: { campaignId }, select: { id: true, name: true, snapshot: true } })
  ]);

  const fileIds = new Set(files.map((file) => file.id));
  const fileById = new Map(files.map((file) => [file.id, file]));
  const relationships = files.flatMap((file) => file.relationshipsFrom.map((relationship) => ({
    id: relationship.id,
    fromId: relationship.fromId,
    toId: relationship.toId,
    kind: relationship.kind,
    typeName: relationship.type.name,
    to: relationship.to
  })));

  for (const relationship of relationships) {
    if (!fileIds.has(relationship.toId) || relationship.to.campaignId !== campaignId) {
      addIssue(errors, {
        id: `broken-relationship-${relationship.id}`,
        severity: 'error',
        message: `O relacionamento de "${fileById.get(relationship.fromId)?.name ?? relationship.fromId}" aponta para uma entidade inexistente ou de outra campanha.`,
        fileId: relationship.fromId
      });
    }
  }

  const relationTargets = new Set(relationships.flatMap((relationship) => [relationship.fromId, relationship.toId]));
  for (const file of files) {
    const data = asRecord(file.data);
    if (file.type !== 'CAMPAIGN' && !relationTargets.has(file.id)) {
      suggestions.push({ id: `orphan-${file.id}`, severity: 'suggestion', message: `"${file.name}" não está conectado a nenhum outro elemento.`, fileId: file.id });
    }
    if (file.type === 'PUZZLE' && !hasPuzzleSolution(data)) {
      errors.push({ id: `puzzle-no-solution-${file.id}`, severity: 'error', message: `O puzzle "${file.name}" não possui uma resposta definida.`, fileId: file.id });
    }
    if (file.type === 'CLUE' && !relationTargets.has(file.id)) {
      warnings.push({ id: `clue-unused-${file.id}`, severity: 'warning', message: `A pista "${file.name}" não é utilizada por nenhum relacionamento.`, fileId: file.id });
    }
    if (file.type === 'DOCUMENT' && !relationTargets.has(file.id)) {
      warnings.push({ id: `document-unused-${file.id}`, severity: 'warning', message: `O documento "${file.name}" não possui referência ou uso na campanha.`, fileId: file.id });
    }
    if (file.type === 'NPC' && !relationTargets.has(file.id)) {
      warnings.push({ id: `npc-unused-${file.id}`, severity: 'warning', message: `O NPC "${file.name}" nunca aparece em um relacionamento.`, fileId: file.id });
    }
    if (file.type === 'LOCATION' && !relationTargets.has(file.id)) {
      warnings.push({ id: `location-empty-${file.id}`, severity: 'warning', message: `O local "${file.name}" não possui conexões na campanha.`, fileId: file.id });
    }
    for (const referenceId of collectReferenceValues(file.data)) {
      if (!fileIds.has(referenceId)) {
        errors.push({ id: `data-reference-${file.id}-${referenceId}`, severity: 'error', message: `"${file.name}" referencia a entidade inexistente "${referenceId}" em seus dados.`, fileId: file.id });
      }
    }
    if (file.type === 'PUZZLE' && !relationships.some((relationship) => relationship.toId === file.id && fileById.get(relationship.fromId)?.type === 'CLUE')) {
      warnings.push({ id: `puzzle-without-clue-${file.id}`, severity: 'warning', message: `O puzzle "${file.name}" não possui pista relacionada.`, fileId: file.id });
    }
  }

  for (const session of sessions) {
    if (session.files.length === 0) warnings.push({ id: `empty-session-${session.id}`, severity: 'warning', message: `A sessão "${session.name}" ainda não tem conteúdo vinculado.` });
  }

  for (let index = 1; index < timelineEvents.length; index += 1) {
    const previous = timelineEvents[index - 1];
    const current = timelineEvents[index];
    if (!previous || !current) continue;
    if (previous.happenedAt > current.happenedAt) {
      errors.push({ id: `timeline-order-${current.id}`, severity: 'error', message: `A timeline possui uma ordem inconsistente próxima de "${current.title}".` });
    }
  }

  const officialSimulation = simulateCampaignGraph(
    files.map((file) => ({ id: file.id, name: file.name, type: file.type, data: file.data })),
    relationships.filter((relationship) => fileIds.has(relationship.toId)).map((relationship) => ({ fromId: relationship.fromId, toId: relationship.toId, label: relationship.typeName || relationship.kind }))
  );
  const boardFileIds = new Set(board.map((node) => node.fileId));
  const boardEdges = board.flatMap((node) => node.edgesFrom.map((edge) => ({ fromId: node.fileId, toId: board.find((target) => target.id === edge.toNodeId)?.fileId ?? edge.toNodeId, label: edge.label })));
  const boardSimulation = simulateCampaignGraph(
    board.map((node) => ({ id: node.fileId, name: node.file.name, type: node.file.type, data: node.file.data })),
    boardEdges.filter((edge) => boardFileIds.has(edge.fromId) && boardFileIds.has(edge.toId))
  );
  const simulation: GraphSimulation = {
    valid: officialSimulation.valid,
    official: officialSimulation,
    board: boardSimulation,
    boardEdgesCount: boardEdges.length,
    generatedAt: new Date().toISOString()
  };

  const investigativeIssues = computeInvestigativeDiagnostics({
    campaignId,
    files: allFiles,
    hypotheses,
    importantRelationships,
    activeBoardFileIds: boardFileIds,
    boardPins,
    boardGroups,
    boardViews
  });
  for (const issue of investigativeIssues) {
    const target = issue.severity === 'error' ? errors : issue.severity === 'warning' ? warnings : suggestions;
    addIssue(target, issue);
  }

  for (const issue of officialSimulation.issues) {
    const target = issue.severity === 'error' ? errors : warnings;
    addIssue(target, { id: `graph-${issue.id}`, severity: issue.severity, message: issue.message, fileId: issue.fileIds[0] });
  }

  const totalChecks = Math.max(files.length + sessions.length + timelineEvents.length, 1);
  const penalty = errors.length * 8 + warnings.length * 3 + suggestions.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - (penalty / totalChecks) * 10)));
  return { score, errors, warnings, suggestions, simulation };
}

function hasPuzzleSolution(data: Record<string, unknown>) {
  return typeof data.solution === 'string' && data.solution.trim().length > 0;
}
