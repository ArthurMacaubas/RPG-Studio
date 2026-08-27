import type { FileType, RelationshipImportance, RelationshipVisibility, SessionPlanItem, SessionPlanning } from '@/types';

export type SessionContextGraph = {
  nodes: Array<{ id: string; name: string; type: FileType }>;
  edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: { name: string; directional: boolean; color: string | null };
    label: string | null;
    description: string | null;
    importance: RelationshipImportance;
    visibility: RelationshipVisibility;
  }>;
};

export type SessionContextRelation = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  typeName: string;
  directional: boolean;
  label: string | null;
  description: string | null;
  importance: RelationshipImportance;
  visibility: RelationshipVisibility;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export function parseContextTargetId(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';
  return ID_PATTERN.test(normalized) ? normalized : null;
}

export function orderSessionPlans(plans: SessionPlanning[]) {
  return [...plans].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function findPreviousSession(plans: SessionPlanning[], selectedId: string) {
  const ordered = orderSessionPlans(plans);
  const index = ordered.findIndex((plan) => plan.id === selectedId);
  return index > 0 ? ordered[index - 1] ?? null : null;
}

export function pendingItems(plan: SessionPlanning | null) {
  if (!plan) return { objectives: [] as SessionPlanItem[], checklist: [] as SessionPlanItem[] };
  return {
    objectives: plan.objectives.filter((item) => !item.done),
    checklist: plan.checklist.filter((item) => !item.done)
  };
}

export function selectContextRelationships(graph: SessionContextGraph, linkedFileIds: ReadonlySet<string>) {
  const names = new Map(graph.nodes.map((node) => [node.id, node.name]));
  return graph.edges
    .filter((edge) => linkedFileIds.has(edge.sourceId) && linkedFileIds.has(edge.targetId))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map<SessionContextRelation>((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      sourceName: names.get(edge.sourceId) ?? 'Ficha indisponível',
      targetName: names.get(edge.targetId) ?? 'Ficha indisponível',
      typeName: edge.type.name,
      directional: edge.type.directional,
      label: edge.label,
      description: edge.description,
      importance: edge.importance,
      visibility: edge.visibility
    }));
}
