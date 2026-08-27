import type { BoardEdgeItem, BoardNodeItem, CampaignFile, FileType, InvestigationHypothesis, RelationshipImportance, RelationshipVisibility } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';

export type BoardLayerState = {
  files: boolean;
  officialRelationships: boolean;
  visualEdges: boolean;
  evidence: boolean;
  hypotheses: boolean;
  annotations?: boolean;
};

export type BoardFilterState = {
  search: string;
  fileType: FileType | 'ALL';
  tagIds: string[];
  scope: 'active' | 'archived' | 'trash';
  favoritesOnly: boolean;
  relationshipImportance: RelationshipImportance | 'ALL';
  relationshipVisibility: RelationshipVisibility | 'ALL';
  layers: BoardLayerState;
};

export type BoardPresenceFilter = 'ALL' | 'ON_BOARD' | 'OFF_BOARD';

export type BoardInvestigationFilters = {
  presence: BoardPresenceFilter;
  usedAsEvidence: boolean;
  inOpenHypothesis: boolean;
  importantRelationship: boolean;
};

export type BoardExplorationContext = {
  boardFileIds?: ReadonlySet<string>;
  hypotheses?: Pick<InvestigationHypothesis, 'status' | 'title' | 'summary' | 'evidence'>[];
  importantRelationshipFileIds?: ReadonlySet<string>;
};

export type OfficialRelationshipFilterItem = {
  sourceId: string;
  targetId: string;
  importance: RelationshipImportance;
  visibility: RelationshipVisibility;
};

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function fileTagSearchText(file: CampaignFile) {
  return (file.tags ?? []).flatMap(({ tag }) => [tag.name, tag.description ?? '']).join(' ');
}

function hypothesisSearchText(fileId: string, hypotheses: BoardExplorationContext['hypotheses'] = []) {
  return hypotheses
    .filter((hypothesis) => hypothesis.evidence.some((evidence) => evidence.fileId === fileId))
    .flatMap((hypothesis) => [hypothesis.title, hypothesis.summary ?? ''])
    .join(' ');
}

export function buildFileSearchText(file: CampaignFile, hypotheses: BoardExplorationContext['hypotheses'] = []) {
  return normalizeSearch([
    file.name,
    FILE_TYPE_LABELS[file.type],
    file.description ?? '',
    file.content ?? '',
    fileTagSearchText(file),
    hypothesisSearchText(file.id, hypotheses),
    JSON.stringify(file.data ?? {})
  ].join(' '));
}

function investigationFileIds(hypotheses: BoardExplorationContext['hypotheses'] = []) {
  const evidenceFileIds = new Set<string>();
  const openHypothesisFileIds = new Set<string>();
  for (const hypothesis of hypotheses) {
    for (const evidence of hypothesis.evidence) {
      evidenceFileIds.add(evidence.fileId);
      if (hypothesis.status === 'OPEN') openHypothesisFileIds.add(evidence.fileId);
    }
  }
  return { evidenceFileIds, openHypothesisFileIds };
}

export function matchesInvestigationFile(
  file: CampaignFile,
  filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>,
  investigation: BoardInvestigationFilters = { presence: 'ALL', usedAsEvidence: false, inOpenHypothesis: false, importantRelationship: false },
  context: BoardExplorationContext = {}
) {
  const scopeMatches = filters.scope === 'active' ? !file.isArchived && !file.isTrashed : filters.scope === 'archived' ? file.isArchived && !file.isTrashed : file.isTrashed;
  const typeMatches = filters.fileType === 'ALL' || file.type === filters.fileType;
  const favoritesMatch = !filters.favoritesOnly || file.isFavorite;
  const tagMatches = !filters.tagIds.length || (file.tags ?? []).some(({ tag }) => filters.tagIds.includes(tag.id));
  const normalizedSearch = normalizeSearch(filters.search);
  const searchMatches = !normalizedSearch || buildFileSearchText(file, context.hypotheses).includes(normalizedSearch);
  const boardFileIds = context.boardFileIds ?? new Set<string>();
  const presenceMatches = investigation.presence === 'ALL' || (investigation.presence === 'ON_BOARD' ? boardFileIds.has(file.id) : !boardFileIds.has(file.id));
  const { evidenceFileIds, openHypothesisFileIds } = investigationFileIds(context.hypotheses);
  const evidenceMatches = !investigation.usedAsEvidence || evidenceFileIds.has(file.id);
  const openHypothesisMatches = !investigation.inOpenHypothesis || openHypothesisFileIds.has(file.id);
  const importantRelationshipMatches = !investigation.importantRelationship || (context.importantRelationshipFileIds?.has(file.id) ?? false);
  return scopeMatches && typeMatches && favoritesMatch && tagMatches && searchMatches && presenceMatches && evidenceMatches && openHypothesisMatches && importantRelationshipMatches;
}

export function filterInvestigationFiles(
  files: CampaignFile[],
  filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>,
  investigation: BoardInvestigationFilters,
  context: BoardExplorationContext
) {
  return files.filter((file) => matchesInvestigationFile(file, filters, investigation, context));
}

export function matchesFileFilters(file: CampaignFile, filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>, context: BoardExplorationContext = {}) {
  return matchesInvestigationFile(file, filters, undefined, context);
}

export function filterBoardNodes(
  nodes: BoardNodeItem[],
  filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>,
  investigation: BoardInvestigationFilters = { presence: 'ALL', usedAsEvidence: false, inOpenHypothesis: false, importantRelationship: false },
  context: BoardExplorationContext = {}
) {
  return nodes.filter((node) => matchesInvestigationFile(node.file, filters, investigation, { ...context, boardFileIds: context.boardFileIds ?? new Set(nodes.map((item) => item.fileId)) }));
}

export function filterBoardEdges(edges: BoardEdgeItem[], nodes: BoardNodeItem[], visibleFileIds: ReadonlySet<string>, enabled: boolean) {
  if (!enabled) return [];
  const fileIdByNodeId = new Map(nodes.map((node) => [node.id, node.fileId]));
  return edges.filter((edge) => visibleFileIds.has(fileIdByNodeId.get(edge.fromNodeId) ?? '') && visibleFileIds.has(fileIdByNodeId.get(edge.toNodeId) ?? ''));
}

export function filterOfficialRelationships<T extends OfficialRelationshipFilterItem>(edges: T[], visibleFileIds: ReadonlySet<string>, filters: Pick<BoardFilterState, 'relationshipImportance' | 'relationshipVisibility' | 'layers'>) {
  if (!filters.layers.officialRelationships) return [];
  return edges.filter((edge) => {
    const importanceMatches = filters.relationshipImportance === 'ALL' || edge.importance === filters.relationshipImportance;
    const visibilityMatches = filters.relationshipVisibility === 'ALL' || edge.visibility === filters.relationshipVisibility;
    return importanceMatches && visibilityMatches && visibleFileIds.has(edge.sourceId) && visibleFileIds.has(edge.targetId);
  });
}
