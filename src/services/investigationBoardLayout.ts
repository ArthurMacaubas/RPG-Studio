import type { BoardNodeItem } from '@/types';

export const MAX_AUTO_LAYOUT_NODES = 120;
export const AUTO_LAYOUT_COLUMN_GAP = 230;
export const AUTO_LAYOUT_ROW_GAP = 120;
export const AUTO_LAYOUT_ORIGIN = { x: 40, y: 40 } as const;

export type LayoutNode = Pick<BoardNodeItem, 'id' | 'fileId' | 'x' | 'y'> & { fileName?: string };

export type LayoutRelationship = {
  sourceId: string;
  targetId: string;
  directional?: boolean;
};

export type BoardNodePosition = {
  nodeId: string;
  fileId: string;
  x: number;
  y: number;
};

export type AutoLayoutResult = {
  positions: BoardNodePosition[];
  cycleNodeIds: string[];
};

function compareNodes(a: LayoutNode, b: LayoutNode) {
  return (a.fileName ?? '').localeCompare(b.fileName ?? '', 'pt-BR', { sensitivity: 'base' }) || a.fileId.localeCompare(b.fileId) || a.id.localeCompare(b.id);
}

function compareIds(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Produces a deterministic left-to-right layered preview. It only returns
 * positions for the input BoardNodes and never mutates a canonical record.
 */
export function computeAutoLayout(input: { nodes: LayoutNode[]; relationships: LayoutRelationship[]; maxNodes?: number }): AutoLayoutResult {
  const maxNodes = input.maxNodes ?? MAX_AUTO_LAYOUT_NODES;
  if (input.nodes.length > maxNodes) throw new Error(`O auto-layout é limitado a ${maxNodes} nós.`);

  const nodes = [...input.nodes].sort(compareNodes);
  const nodeByFileId = new Map(nodes.map((node) => [node.fileId, node]));
  const adjacency = new Map<string, Set<string>>();
  const indegree = new Map<string, number>(nodes.map((node) => [node.fileId, 0]));

  for (const node of nodes) adjacency.set(node.fileId, new Set());
  for (const relationship of input.relationships) {
    if (!nodeByFileId.has(relationship.sourceId) || !nodeByFileId.has(relationship.targetId)) continue;
    // An undirected relation remains bidirectional in the domain. For layout only,
    // orient it by stable fileId order so an undirected graph cannot manufacture a cycle.
    const sourceId = relationship.directional === false && relationship.sourceId.localeCompare(relationship.targetId) > 0 ? relationship.targetId : relationship.sourceId;
    const targetId = sourceId === relationship.sourceId ? relationship.targetId : relationship.sourceId;
    const neighbors = adjacency.get(sourceId);
    if (neighbors && !neighbors.has(targetId)) {
      neighbors.add(targetId);
      indegree.set(targetId, (indegree.get(targetId) ?? 0) + 1);
    }
  }

  const layers = new Map<string, number>();
  let frontier = nodes.filter((node) => indegree.get(node.fileId) === 0).map((node) => node.fileId).sort(compareIds);
  let layer = 0;
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const fileId of frontier) {
      if (layers.has(fileId)) continue;
      layers.set(fileId, layer);
      for (const neighbor of [...(adjacency.get(fileId) ?? [])].sort(compareIds)) {
        indegree.set(neighbor, (indegree.get(neighbor) ?? 0) - 1);
        if (indegree.get(neighbor) === 0) next.push(neighbor);
      }
    }
    frontier = [...new Set(next)].sort(compareIds);
    layer += 1;
  }

  const cycleNodes = nodes.filter((node) => !layers.has(node.fileId));
  const cycleLayer = layer;
  for (const node of cycleNodes) layers.set(node.fileId, cycleLayer);

  const byLayer = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const nodeLayer = layers.get(node.fileId) ?? 0;
    const bucket = byLayer.get(nodeLayer) ?? [];
    bucket.push(node);
    byLayer.set(nodeLayer, bucket);
  }

  const positions: BoardNodePosition[] = [];
  for (const [nodeLayer, layerNodes] of [...byLayer.entries()].sort(([a], [b]) => a - b)) {
    layerNodes.sort(compareNodes);
    layerNodes.forEach((node, index) => {
      positions.push({
        nodeId: node.id,
        fileId: node.fileId,
        x: AUTO_LAYOUT_ORIGIN.x + nodeLayer * AUTO_LAYOUT_COLUMN_GAP,
        y: AUTO_LAYOUT_ORIGIN.y + index * AUTO_LAYOUT_ROW_GAP
      });
    });
  }

  return { positions, cycleNodeIds: cycleNodes.map((node) => node.id).sort(compareIds) };
}
