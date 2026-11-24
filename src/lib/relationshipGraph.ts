import type { FileType, RelationshipGraphData } from '@/types';

export interface RelationshipGraphPosition {
  x: number;
  y: number;
}

export interface RelationshipGraphFilters {
  query?: string;
  nodeType?: FileType | 'ALL';
  relationshipTypeId?: string | 'ALL';
  focusNodeId?: string | null;
}

export function relationshipGraphStorageKey(campaignId: string, userId: string) {
  return `rpg-studio:relationship-graph:${campaignId}:${userId}`;
}

export function filterRelationshipGraph(data: RelationshipGraphData, filters: RelationshipGraphFilters): RelationshipGraphData {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  const matchingNodeIds = new Set(
    data.nodes
      .filter((node) => {
        const matchesQuery = !query || node.name.toLocaleLowerCase().includes(query);
        const matchesType = !filters.nodeType || filters.nodeType === 'ALL' || node.type === filters.nodeType;
        return matchesQuery && matchesType;
      })
      .map((node) => node.id)
  );

  if (filters.focusNodeId) {
    const focusedNeighbors = new Set([filters.focusNodeId]);
    for (const edge of data.edges) {
      if (edge.sourceId === filters.focusNodeId) focusedNeighbors.add(edge.targetId);
      if (edge.targetId === filters.focusNodeId) focusedNeighbors.add(edge.sourceId);
    }
    for (const node of data.nodes) {
      if (!focusedNeighbors.has(node.id)) matchingNodeIds.delete(node.id);
    }
  }

  const nodes = data.nodes.filter((node) => matchingNodeIds.has(node.id));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = data.edges.filter((edge) =>
    nodeIds.has(edge.sourceId)
    && nodeIds.has(edge.targetId)
    && (!filters.relationshipTypeId || filters.relationshipTypeId === 'ALL' || edge.type.id === filters.relationshipTypeId)
  );
  return { nodes, edges };
}

export function autoLayoutRelationshipGraph(data: RelationshipGraphData): Record<string, RelationshipGraphPosition> {
  const groups = new Map<FileType, typeof data.nodes>();
  for (const node of data.nodes) {
    const group = groups.get(node.type) ?? [];
    group.push(node);
    groups.set(node.type, group);
  }

  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, groups.size))));
  const positions: Record<string, RelationshipGraphPosition> = {};
  [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([type, nodes], groupIndex) => {
    const groupColumn = groupIndex % columns;
    const groupRow = Math.floor(groupIndex / columns);
    const originX = 220 + groupColumn * 330;
    const originY = 160 + groupRow * 300;
    nodes.forEach((node, nodeIndex) => {
      positions[node.id] = {
        x: originX + (nodeIndex % 2) * 150,
        y: originY + Math.floor(nodeIndex / 2) * 110
      };
    });
    void type;
  });
  return positions;
}
