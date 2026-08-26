import type { BoardEdgeItem, BoardNodeItem, CampaignFile, FileType, RelationshipImportance, RelationshipVisibility } from '@/types';

export type BoardLayerState = {
  files: boolean;
  officialRelationships: boolean;
  visualEdges: boolean;
  evidence: boolean;
  hypotheses: boolean;
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

export type OfficialRelationshipFilterItem = {
  sourceId: string;
  targetId: string;
  importance: RelationshipImportance;
  visibility: RelationshipVisibility;
};

export function matchesFileFilters(file: CampaignFile, filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>) {
  const scopeMatches = filters.scope === 'active' ? !file.isArchived && !file.isTrashed : filters.scope === 'archived' ? file.isArchived && !file.isTrashed : file.isTrashed;
  const typeMatches = filters.fileType === 'ALL' || file.type === filters.fileType;
  const favoritesMatch = !filters.favoritesOnly || file.isFavorite;
  const tagMatches = !filters.tagIds.length || (file.tags ?? []).some(({ tag }) => filters.tagIds.includes(tag.id));
  const normalizedSearch = filters.search.trim().toLocaleLowerCase();
  const searchable = `${file.name} ${file.description ?? ''} ${file.content ?? ''} ${JSON.stringify(file.data ?? {})}`.toLocaleLowerCase();
  return scopeMatches && typeMatches && favoritesMatch && tagMatches && (!normalizedSearch || searchable.includes(normalizedSearch));
}

export function filterBoardNodes(nodes: BoardNodeItem[], filters: Pick<BoardFilterState, 'search' | 'fileType' | 'tagIds' | 'scope' | 'favoritesOnly'>) {
  return nodes.filter((node) => matchesFileFilters(node.file, filters));
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
