import type { EvidenceStance, InvestigationHypothesis } from '@/types';

export const MAX_PATH_DEPTH = 12;
export const MAX_PATHS = 12;

export type PathSource = 'RELATIONSHIP' | 'HYPOTHESIS_EVIDENCE';
export type PathMode = 'OFFICIAL' | 'EVIDENCE' | 'COMBINED';

export type InvestigationPathSegment = {
  source: PathSource;
  fromFileId: string;
  toFileId: string;
  relationshipId?: string;
  hypothesisId?: string;
  evidenceId?: string;
  stance?: EvidenceStance;
  label: string;
};

export type InvestigationPath = {
  fileIds: string[];
  segments: InvestigationPathSegment[];
};

export type InvestigationPathsResult = {
  paths: InvestigationPath[];
  message: string | null;
  truncated: boolean;
};

type PathRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  kind?: string;
  type?: { name?: string; directional?: boolean };
};
type PathEvidence = Pick<InvestigationHypothesis, 'id'> & { evidence: Array<Pick<InvestigationHypothesis['evidence'][number], 'id' | 'fileId' | 'stance' | 'order'>> };

type PathEdge = InvestigationPathSegment & { neighborId: string; priority: number };

function stableCompare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortEdges(a: PathEdge, b: PathEdge) {
  return stableCompare(a.neighborId, b.neighborId) || a.priority - b.priority || stableCompare(a.source, b.source) || stableCompare(a.relationshipId ?? a.evidenceId ?? '', b.relationshipId ?? b.evidenceId ?? '');
}

function relationshipLabel(relationship: PathRelationship) {
  return relationship.label?.trim() || relationship.type?.name || relationship.kind || 'Relação oficial';
}

function createRelationshipEdges(relationships: PathRelationship[], nodeIds: Set<string>) {
  const adjacency = new Map<string, PathEdge[]>();
  for (const relationship of relationships) {
    if (!nodeIds.has(relationship.sourceId) || !nodeIds.has(relationship.targetId)) continue;
    const forward: PathEdge = {
      neighborId: relationship.targetId,
      source: 'RELATIONSHIP',
      fromFileId: relationship.sourceId,
      toFileId: relationship.targetId,
      relationshipId: relationship.id,
      label: relationshipLabel(relationship),
      priority: 0
    };
    adjacency.set(relationship.sourceId, [...(adjacency.get(relationship.sourceId) ?? []), forward]);
    if (relationship.type?.directional === false) {
      const reverse: PathEdge = {
        ...forward,
        neighborId: relationship.sourceId,
        fromFileId: relationship.targetId,
        toFileId: relationship.sourceId,
        priority: 0
      };
      adjacency.set(relationship.targetId, [...(adjacency.get(relationship.targetId) ?? []), reverse]);
    }
  }
  for (const [fileId, edges] of adjacency) adjacency.set(fileId, edges.sort(sortEdges));
  return adjacency;
}

function createEvidenceEdges(hypothesis: PathEvidence | null, nodeIds: Set<string>) {
  const adjacency = new Map<string, PathEdge[]>();
  if (!hypothesis) return adjacency;
  const evidence = [...hypothesis.evidence].filter((item) => nodeIds.has(item.fileId)).sort((a, b) => a.order - b.order || stableCompare(a.fileId, b.fileId) || stableCompare(a.id, b.id));
  for (let index = 0; index < evidence.length - 1; index += 1) {
    const from = evidence[index]!;
    const to = evidence[index + 1]!;
    const segment: PathEdge = {
      neighborId: to.fileId,
      source: 'HYPOTHESIS_EVIDENCE',
      fromFileId: from.fileId,
      toFileId: to.fileId,
      hypothesisId: hypothesis.id,
      evidenceId: `${from.id}:${to.id}`,
      stance: to.stance,
      label: 'Evidência da hipótese — não é relação oficial',
      priority: 1
    };
    adjacency.set(from.fileId, [...(adjacency.get(from.fileId) ?? []), segment]);
    adjacency.set(to.fileId, [...(adjacency.get(to.fileId) ?? []), { ...segment, neighborId: from.fileId, fromFileId: to.fileId, toFileId: from.fileId, priority: 1 }]);
  }
  return adjacency;
}

function mergeAdjacency(...maps: Array<Map<string, PathEdge[]>>) {
  const adjacency = new Map<string, PathEdge[]>();
  for (const map of maps) {
    for (const [fileId, edges] of map) adjacency.set(fileId, [...(adjacency.get(fileId) ?? []), ...edges]);
  }
  for (const [fileId, edges] of adjacency) adjacency.set(fileId, edges.sort(sortEdges));
  return adjacency;
}

/** Finds simple, bounded, deterministic paths without mutating graph data. */
export function findInvestigationPaths(input: {
  nodeFileIds: string[];
  sourceFileId: string;
  targetFileId: string;
  mode: PathMode;
  relationships: PathRelationship[];
  hypothesis?: PathEvidence | null;
  maxDepth?: number;
  maxPaths?: number;
}): InvestigationPathsResult {
  const nodeIds = new Set(input.nodeFileIds);
  if (!nodeIds.has(input.sourceFileId) || !nodeIds.has(input.targetFileId)) {
    return { paths: [], message: 'A origem e o destino precisam estar no quadro ativo.', truncated: false };
  }
  if (input.sourceFileId === input.targetFileId) {
    return { paths: [{ fileIds: [input.sourceFileId], segments: [] }], message: null, truncated: false };
  }

  const official = createRelationshipEdges(input.relationships, nodeIds);
  const evidence = createEvidenceEdges(input.hypothesis ?? null, nodeIds);
  const adjacency = input.mode === 'OFFICIAL' ? official : input.mode === 'EVIDENCE' ? evidence : mergeAdjacency(official, evidence);
  const maxDepth = Math.max(1, Math.min(MAX_PATH_DEPTH, input.maxDepth ?? MAX_PATH_DEPTH));
  const maxPaths = Math.max(1, Math.min(MAX_PATHS, input.maxPaths ?? MAX_PATHS));
  const paths: InvestigationPath[] = [];
  const queue: Array<{ fileIds: string[]; segments: InvestigationPathSegment[] }> = [{ fileIds: [input.sourceFileId], segments: [] }];
  let truncated = false;

  while (queue.length > 0 && paths.length < maxPaths) {
    const current = queue.shift()!;
    const currentId = current.fileIds[current.fileIds.length - 1];
    if (!currentId) continue;
    if (currentId === input.targetFileId) {
      paths.push({ fileIds: current.fileIds, segments: current.segments });
      continue;
    }
    if (current.segments.length >= maxDepth) {
      truncated = truncated || (adjacency.get(currentId)?.length ?? 0) > 0;
      continue;
    }
    for (const edge of adjacency.get(currentId) ?? []) {
      if (current.fileIds.includes(edge.neighborId)) continue;
      queue.push({ fileIds: [...current.fileIds, edge.neighborId], segments: [...current.segments, { source: edge.source, fromFileId: edge.fromFileId, toFileId: edge.toFileId, relationshipId: edge.relationshipId, hypothesisId: edge.hypothesisId, evidenceId: edge.evidenceId, stance: edge.stance, label: edge.label }] });
    }
  }
  if (queue.length > 0) truncated = true;
  return { paths, message: paths.length > 0 ? null : input.mode === 'EVIDENCE' ? 'Nenhum caminho evidencial foi encontrado na hipótese selecionada.' : 'Nenhum caminho foi encontrado entre os nós selecionados.', truncated };
}
