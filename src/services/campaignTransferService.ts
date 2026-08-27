import { prisma } from '@/lib/prisma';
import type {
  CampaignExportDocument,
  CampaignExportBoardView,
  CampaignImportDryRun,
  CampaignImportIdentityMode,
  CampaignTransferSummary,
  CampaignTransferValidation,
  CampaignTransferValidationIssue,
  FileType,
  RelationshipImportance,
  RelationshipKind,
  RelationshipVisibility,
  SystemType
} from '@/types';
import { Prisma } from '@prisma/client';
import { assertCampaignRole } from '@/lib/access';

const SYSTEM_TYPES: SystemType[] = ['ORDEM_PARANORMAL', 'DND_5E', 'CUSTOM'];
const FILE_TYPES: FileType[] = [
  'CAMPAIGN',
  'NPC',
  'CHARACTER',
  'THREAT',
  'PUZZLE',
  'DOCUMENT',
  'CLUE',
  'OBJECT',
  'EVENT',
  'SESSION',
  'MAP',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'NOTE',
  'LOCATION'
];
const RELATIONSHIP_KINDS: RelationshipKind[] = [
  'GENERIC',
  'LEADS_TO',
  'BELONGS_TO',
  'CONTAINS',
  'BLOCKS',
  'UNLOCKS'
];
const SUPPORTED_GLOBAL_RELATIONSHIP_TYPE_KEYS = new Set([
  ...RELATIONSHIP_KINDS,
  'KNOWS',
  'SUSPECTS',
  'REVEALS',
  'DEPENDS_ON',
  'CAUSES',
  'CONTRADICTS'
]);
const RELATIONSHIP_IMPORTANCES: RelationshipImportance[] = ['CRITICAL', 'IMPORTANT', 'NORMAL', 'OPTIONAL'];
const RELATIONSHIP_VISIBILITIES: RelationshipVisibility[] = ['GM', 'ALL', 'P1', 'P2', 'P3', 'P4'];
const HYPOTHESIS_STATUSES = new Set(['OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED']);
const EVIDENCE_STANCES = new Set(['SUPPORTS', 'CONTRADICTS', 'CONTEXT']);
const BOARD_ANNOTATION_COLOR = /^#[0-9a-f]{6}$/i;
const BOARD_VIEW_KINDS = new Set(['SESSION', 'CASE', 'ARC']);
const BOARD_VIEW_SCOPES = new Set(['active', 'archived', 'trash']);
const BOARD_VIEW_FILE_TYPES = new Set(['ALL', ...FILE_TYPES]);
const BOARD_VIEW_LAYER_KEYS = ['files', 'officialRelationships', 'visualEdges', 'evidence', 'hypotheses', 'annotations'] as const;
const BOARD_VIEW_MAX_SNAPSHOT_BYTES = 20_000;
const SESSION_PLANNING_STATUSES = new Set(['PLANNED', 'COMPLETED']);
const SESSION_CHECKLIST_MAX_ITEMS = 80;
const SESSION_PLAN_MAX_ITEMS = 20;
const SESSION_PLAN_ITEM_MAX_TEXT = 240;

export class CampaignTransferError extends Error {
  validation: CampaignTransferValidation;

  constructor(validation: CampaignTransferValidation) {
    super('O arquivo de campanha não passou na validação.');
    this.name = 'CampaignTransferError';
    this.validation = validation;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizedRelationshipTypeKey(value: unknown) {
  return hasNonEmptyString(value) ? value.trim().toUpperCase() : null;
}

function effectiveRelationshipTypeKey(relationship: Record<string, any>) {
  const typeKey = normalizedRelationshipTypeKey(relationship.typeKey);
  if (typeKey) return typeKey;
  return RELATIONSHIP_KINDS.includes(relationship.kind) ? relationship.kind : null;
}

function relationshipTypeValidationIssues(document: Record<string, any>, allowedGlobalTypeKeys: ReadonlySet<string>): CampaignTransferValidationIssue[] {
  const issues: CampaignTransferValidationIssue[] = [];
  const declaredTypeKeys = new Set<string>();

  for (const [index, relationshipType] of asArray(document.relationshipTypes).entries()) {
    if (!isRecord(relationshipType) || !hasNonEmptyString(relationshipType.key) || !hasNonEmptyString(relationshipType.name)) {
      issues.push({ path: `relationshipTypes[${index}]`, value: relationshipType, rule: 'relationshipType.key_and_name', message: `relationshipTypes[${index}] precisa conter key e name.` });
      continue;
    }
    const key = normalizedRelationshipTypeKey(relationshipType.key)!;
    if (declaredTypeKeys.has(key)) issues.push({ path: `relationshipTypes[${index}].key`, value: relationshipType.key, rule: 'unique.relationshipType.key', message: `relationshipTypes contém a chave duplicada "${key}".` });
    declaredTypeKeys.add(key);

    if (relationshipType.scope !== undefined && relationshipType.scope !== 'GLOBAL' && relationshipType.scope !== 'CAMPAIGN') {
      issues.push({ path: `relationshipTypes[${index}].scope`, value: relationshipType.scope, rule: 'relationshipType.scope', message: `relationshipTypes[${index}].scope deve ser GLOBAL ou CAMPAIGN.` });
    }
    if (relationshipType.scope === 'GLOBAL' && !allowedGlobalTypeKeys.has(key)) {
      issues.push({ path: `relationshipTypes[${index}].key`, value: key, rule: 'relationshipType.global_exists', message: `relationshipTypes[${index}].key "${key}" é inválida: tipo global não encontrado entre os tipos globais suportados.` });
    }
  }

  for (const [index, relationship] of asArray(document.relationships).entries()) {
    if (!isRecord(relationship)) continue;
    const key = effectiveRelationshipTypeKey(relationship);
    if (!key) continue;
    if (!declaredTypeKeys.has(key) && !allowedGlobalTypeKeys.has(key)) {
      const suppliedKey = hasNonEmptyString(relationship.typeKey) ? relationship.typeKey.trim() : key;
      issues.push({ path: `relationships[${index}].typeKey`, value: suppliedKey, rule: 'reference.relationshipType.exists', message: `relationships[${index}].typeKey "${suppliedKey}" é inválido: tipo não encontrado em relationshipTypes nem entre os tipos globais suportados.` });
    }
  }

  return issues;
}

const ISO_UTC_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function addValidationIssue(
  errors: string[],
  issues: CampaignTransferValidationIssue[],
  path: string,
  value: unknown,
  rule: string,
  message: string
) {
  errors.push(message);
  issues.push({ path, value, rule, message });
}

function isStrictExportDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_UTC_MILLISECONDS.test(value) && !Number.isNaN(new Date(value).getTime()) && new Date(value).toISOString() === value;
}

function validateExportDate(
  errors: string[],
  issues: CampaignTransferValidationIssue[],
  path: string,
  value: unknown,
  options: { nullable?: boolean } = {}
) {
  if (options.nullable && (value === null || value === undefined)) return;
  if (!isStrictExportDate(value)) {
    addValidationIssue(errors, issues, path, value, 'date.iso_utc_milliseconds', `${path} contém uma data inválida. O valor precisa estar no formato ISO UTC com milissegundos.`);
  }
}

function dateFromValidated(value: string, path: string) {
  if (!isStrictExportDate(value)) {
    throw new Error(`${path} deveria ter sido validado antes da importação.`);
  }
  return new Date(value);
}

export function remapCustomSystemData(value: unknown, maps: {
  attributeIds: Map<string, string>;
  skillIds: Map<string, string>;
  classIds: Map<string, string>;
  raceIds: Map<string, string>;
}, key?: string): unknown {
  if (Array.isArray(value)) return value.map((item) => remapCustomSystemData(item, maps, key));
  if (!isRecord(value)) {
    const requiredMap = key === 'classId' ? maps.classIds : key === 'raceId' ? maps.raceIds : key === 'attributeId' ? maps.attributeIds : key === 'skillId' ? maps.skillIds : null;
    if (typeof value === 'string' && requiredMap) {
      const remapped = requiredMap.get(value);
      if (!remapped) throw new Error(`Referência de sistema personalizado sem mapeamento: ${key}=${value}.`);
      return remapped;
    }
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    const keyMap = childKey === 'attributes' ? maps.attributeIds : childKey === 'skills' ? maps.skillIds : undefined;
    if (keyMap && isRecord(childValue)) {
      result[childKey] = Object.fromEntries(Object.entries(childValue).map(([id, nestedValue]) => {
        const remapped = keyMap.get(id);
        if (!remapped) throw new Error(`Referência de sistema personalizado sem mapeamento: ${childKey}.${id}.`);
        return [remapped, remapCustomSystemData(nestedValue, maps, childKey)];
      }));
    } else {
      result[childKey] = remapCustomSystemData(childValue, maps, childKey);
    }
  }
  return result;
}

function validateCustomSystemDataReferences(
  value: unknown,
  path: string,
  customIds: Map<string, Set<string>>,
  errors: string[],
  issues: CampaignTransferValidationIssue[]
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateCustomSystemDataReferences(item, `${path}[${index}]`, customIds, errors, issues));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const targetKind = key === 'classId' ? 'classes' : key === 'raceId' ? 'races' : key === 'attributeId' ? 'attributes' : key === 'skillId' ? 'skills' : null;
    if (targetKind && typeof child === 'string' && !customIds.get(targetKind)?.has(child)) {
      addValidationIssue(errors, issues, `${path}.${key}`, child, `reference.customSystem.${targetKind}`, `${path}.${key} referencia um ID inexistente em customSystem.${targetKind}.`);
      continue;
    }
    if ((key === 'attributes' || key === 'skills') && isRecord(child)) {
      const targetIds = customIds.get(key);
      for (const [referenceId, nested] of Object.entries(child)) {
        if (!targetIds?.has(referenceId)) {
          addValidationIssue(errors, issues, `${path}.${key}.${referenceId}`, referenceId, `reference.customSystem.${key}`, `${path}.${key}.${referenceId} referencia um ID inexistente em customSystem.${key}.`);
        }
        validateCustomSystemDataReferences(nested, `${path}.${key}.${referenceId}`, customIds, errors, issues);
      }
      continue;
    }
    validateCustomSystemDataReferences(child, `${path}.${key}`, customIds, errors, issues);
  }
}

function summaryOf(document: Record<string, any>): CampaignTransferSummary {
  const board = isRecord(document.board) ? document.board : {};
  return {
    files: asArray(document.files).length,
    tags: asArray(document.tags).length,
    relationships: asArray(document.relationships).length,
    sessions: asArray(document.sessions).length,
    timelineEvents: asArray(document.timelineEvents).length,
    boardNodes: asArray(board.nodes).length,
    boardEdges: asArray(board.edges).length,
    boardPins: asArray(board.pins).length,
    boardGroups: asArray(board.groups).length,
    boardViews: asArray(board.views).length
  };
}

function validateFiniteRange(errors: string[], issues: CampaignTransferValidationIssue[], path: string, value: unknown, min: number, max: number, rule: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) addValidationIssue(errors, issues, path, value, rule, `${path} está fora do intervalo permitido.`);
}

function validateBoardViewSnapshot(errors: string[], issues: CampaignTransferValidationIssue[], path: string, snapshot: unknown, pinCount: number, groupCount: number) {
  if (!isRecord(snapshot)) {
    addValidationIssue(errors, issues, path, snapshot, 'shape.boardView.snapshot', `${path} deve ser um objeto.`);
    return;
  }
  try {
    if (JSON.stringify(snapshot).length > BOARD_VIEW_MAX_SNAPSHOT_BYTES) addValidationIssue(errors, issues, path, '[snapshot]', 'max.boardView.snapshot', `${path} excede o limite de tamanho.`);
  } catch {
    addValidationIssue(errors, issues, path, '[snapshot]', 'json.boardView.snapshot', `${path} não é serializável como JSON.`);
  }
  const pan = isRecord(snapshot.pan) ? snapshot.pan : {};
  validateFiniteRange(errors, issues, `${path}.pan.x`, pan.x, -100000, 100000, 'range.boardView.pan.x');
  validateFiniteRange(errors, issues, `${path}.pan.y`, pan.y, -100000, 100000, 'range.boardView.pan.y');
  validateFiniteRange(errors, issues, `${path}.zoom`, snapshot.zoom, 0.3, 2, 'range.boardView.zoom');
  const filters = isRecord(snapshot.filters) ? snapshot.filters : {};
  if (typeof filters.search !== 'string' || filters.search.length > 200) addValidationIssue(errors, issues, `${path}.filters.search`, filters.search, 'max.boardView.search', `${path}.filters.search é inválida ou muito longa.`);
  if (typeof filters.fileType !== 'string' || !BOARD_VIEW_FILE_TYPES.has(filters.fileType)) addValidationIssue(errors, issues, `${path}.filters.fileType`, filters.fileType, 'enum.boardView.fileType', `${path}.filters.fileType contém um tipo inválido.`);
  if (!Array.isArray(filters.tagIds) || filters.tagIds.some((tagId) => typeof tagId !== 'string') || new Set(filters.tagIds).size !== filters.tagIds.length) addValidationIssue(errors, issues, `${path}.filters.tagIds`, filters.tagIds, 'shape.boardView.tagIds', `${path}.filters.tagIds deve ser uma lista de IDs únicos.`);
  if (typeof filters.scope !== 'string' || !BOARD_VIEW_SCOPES.has(filters.scope)) addValidationIssue(errors, issues, `${path}.filters.scope`, filters.scope, 'enum.boardView.scope', `${path}.filters.scope contém um escopo inválido.`);
  if (typeof filters.favoritesOnly !== 'boolean') addValidationIssue(errors, issues, `${path}.filters.favoritesOnly`, filters.favoritesOnly, 'boolean.boardView.favoritesOnly', `${path}.filters.favoritesOnly deve ser booleano.`);
  if (filters.relationshipImportance !== 'ALL' && !RELATIONSHIP_IMPORTANCES.includes(filters.relationshipImportance)) addValidationIssue(errors, issues, `${path}.filters.relationshipImportance`, filters.relationshipImportance, 'enum.boardView.relationshipImportance', `${path}.filters.relationshipImportance é inválida.`);
  if (filters.relationshipVisibility !== 'ALL' && !RELATIONSHIP_VISIBILITIES.includes(filters.relationshipVisibility)) addValidationIssue(errors, issues, `${path}.filters.relationshipVisibility`, filters.relationshipVisibility, 'enum.boardView.relationshipVisibility', `${path}.filters.relationshipVisibility é inválida.`);
  if (filters.hypothesisStatus !== 'ALL' && !HYPOTHESIS_STATUSES.has(filters.hypothesisStatus)) addValidationIssue(errors, issues, `${path}.filters.hypothesisStatus`, filters.hypothesisStatus, 'enum.boardView.hypothesisStatus', `${path}.filters.hypothesisStatus é inválida.`);
  if (filters.evidenceStance !== 'ALL' && !EVIDENCE_STANCES.has(filters.evidenceStance)) addValidationIssue(errors, issues, `${path}.filters.evidenceStance`, filters.evidenceStance, 'enum.boardView.evidenceStance', `${path}.filters.evidenceStance é inválida.`);
  const layers = isRecord(filters.layers) ? filters.layers : {};
  for (const key of BOARD_VIEW_LAYER_KEYS) if (typeof layers[key] !== 'boolean') addValidationIssue(errors, issues, `${path}.filters.layers.${key}`, layers[key], 'boolean.boardView.layer', `${path}.filters.layers.${key} deve ser booleano.`);
  for (const [key, max, label] of [['pinIndexes', pinCount, 'pin'], ['groupIndexes', groupCount, 'group'] as const]) {
    const indexes = snapshot[key];
    if (!Array.isArray(indexes) || indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= max) || new Set(indexes).size !== indexes.length) addValidationIssue(errors, issues, `${path}.${key}`, indexes, `reference.boardView.${label}`, `${path}.${key} contém referências inválidas ou duplicadas.`);
  }
}

function validateSessionPlanItems(
  errors: string[],
  issues: CampaignTransferValidationIssue[],
  path: string,
  value: unknown
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    addValidationIssue(errors, issues, path, value, 'shape.sessionPlan.items', `${path} deve ser uma lista.`);
    return;
  }
  const maxItems = path.endsWith('.checklist') ? SESSION_CHECKLIST_MAX_ITEMS : SESSION_PLAN_MAX_ITEMS;
  if (value.length > maxItems) addValidationIssue(errors, issues, path, value.length, 'max.sessionPlan.items', `${path} pode conter no máximo ${maxItems} itens.`);
  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item) || !hasNonEmptyString(item.label)) {
      addValidationIssue(errors, issues, `${itemPath}.label`, isRecord(item) ? item.label : item, 'required.sessionPlan.item.label', `${itemPath}.label é obrigatório.`);
      continue;
    }
    if (item.label.trim().length > SESSION_PLAN_ITEM_MAX_TEXT) addValidationIssue(errors, issues, `${itemPath}.label`, item.label, 'max.sessionPlan.item.label', `${itemPath}.label pode ter no máximo ${SESSION_PLAN_ITEM_MAX_TEXT} caracteres.`);
    if (item.id !== undefined && !hasNonEmptyString(item.id)) addValidationIssue(errors, issues, `${itemPath}.id`, item.id, 'format.sessionPlan.item.id', `${itemPath}.id é inválido.`);
    if (item.done !== undefined && typeof item.done !== 'boolean') addValidationIssue(errors, issues, `${itemPath}.done`, item.done, 'boolean.sessionPlan.item.done', `${itemPath}.done deve ser booleano.`);
  }
}

function validateSessionIdList(
  errors: string[],
  issues: CampaignTransferValidationIssue[],
  path: string,
  value: unknown,
  availableIds: ReadonlySet<string>,
  referenceRule: string
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    addValidationIssue(errors, issues, path, value, 'shape.sessionPlan.references', `${path} deve ser uma lista.`);
    return;
  }
  const seen = new Set<string>();
  for (const [index, id] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!hasNonEmptyString(id) || seen.has(id)) {
      addValidationIssue(errors, issues, itemPath, id, 'unique.sessionPlan.reference', `${itemPath} deve conter IDs únicos e não vazios.`);
      continue;
    }
    seen.add(id);
    if (!availableIds.has(id)) addValidationIssue(errors, issues, itemPath, id, referenceRule, `${itemPath} referencia uma entidade inexistente.`);
  }
}

export function validateCampaignExportDocument(input: unknown): CampaignTransferValidation {
  const errors: string[] = [];
  const issues: CampaignTransferValidationIssue[] = [];
  const warnings: string[] = [];
  const document = isRecord(input) ? input : {};
  const summary = summaryOf(document);

  if (!isRecord(input)) {
    errors.push('O documento precisa ser um objeto JSON.');
    return { valid: false, errors, issues, warnings, summary };
  }
  if (document.format !== 'rpg-campaign-studio') errors.push('O campo "format" deve ser "rpg-campaign-studio".');
  if (document.version !== 1) errors.push('A versão do template deve ser 1.');
  validateExportDate(errors, issues, 'exportedAt', document.exportedAt);
  if (!isRecord(document.campaign)) {
    errors.push('O campo "campaign" é obrigatório e deve ser um objeto.');
  } else {
    if (!hasNonEmptyString(document.campaign.name)) errors.push('A campanha precisa de um nome.');
    if (!SYSTEM_TYPES.includes(document.campaign.system)) errors.push('O sistema da campanha é inválido.');
  }

  const files = asArray(document.files);
  const fileIds = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (!isRecord(file)) {
      errors.push(`files[${index}] precisa ser um objeto.`);
      continue;
    }
    if (!hasNonEmptyString(file.id)) errors.push(`files[${index}].id é obrigatório.`);
    if (hasNonEmptyString(file.id)) {
      if (fileIds.has(file.id)) errors.push(`O ID de arquivo "${file.id}" aparece mais de uma vez.`);
      fileIds.add(file.id);
    }
    if (!FILE_TYPES.includes(file.type)) errors.push(`files[${index}].type contém um tipo inválido.`);
    if (!hasNonEmptyString(file.name)) errors.push(`files[${index}].name é obrigatório.`);
    validateExportDate(errors, issues, `files[${index}].createdAt`, file.createdAt);
    validateExportDate(errors, issues, `files[${index}].updatedAt`, file.updatedAt);
    validateExportDate(errors, issues, `files[${index}].trashedAt`, file.trashedAt, { nullable: true });
    if (file.data !== undefined && !isRecord(file.data)) errors.push(`files[${index}].data deve ser um objeto JSON.`);
    if (file.tags !== undefined && !Array.isArray(file.tags)) errors.push(`files[${index}].tags deve ser uma lista.`);
    if (file.attachments !== undefined && !Array.isArray(file.attachments)) errors.push(`files[${index}].attachments deve ser uma lista.`);
    if (file.comments !== undefined && !Array.isArray(file.comments)) errors.push(`files[${index}].comments deve ser uma lista.`);
    if (file.history !== undefined && !Array.isArray(file.history)) errors.push(`files[${index}].history deve ser uma lista.`);
    for (const [attachmentIndex, attachment] of asArray(file.attachments).entries()) {
      if (!isRecord(attachment) || !hasNonEmptyString(attachment.url)) errors.push(`files[${index}].attachments[${attachmentIndex}].url é obrigatório.`);
      if (isRecord(attachment)) validateExportDate(errors, issues, `files[${index}].attachments[${attachmentIndex}].createdAt`, attachment.createdAt);
    }
    for (const [commentIndex, comment] of asArray(file.comments).entries()) {
      if (!isRecord(comment) || !hasNonEmptyString(comment.body) || !hasNonEmptyString(comment.createdAt)) errors.push(`files[${index}].comments[${commentIndex}] precisa conter body e createdAt.`);
      if (isRecord(comment)) validateExportDate(errors, issues, `files[${index}].comments[${commentIndex}].createdAt`, comment.createdAt);
    }
    for (const [historyIndex, history] of asArray(file.history).entries()) {
      if (!isRecord(history) || !hasNonEmptyString(history.action) || !hasNonEmptyString(history.createdAt)) errors.push(`files[${index}].history[${historyIndex}] precisa conter action e createdAt.`);
      if (isRecord(history)) validateExportDate(errors, issues, `files[${index}].history[${historyIndex}].createdAt`, history.createdAt);
    }
  }

  const tags = asArray(document.tags);
  const tagIds = new Set<string>();
  for (const [index, tag] of tags.entries()) {
    if (!isRecord(tag) || !hasNonEmptyString(tag.id) || !hasNonEmptyString(tag.name)) {
      errors.push(`tags[${index}] precisa conter id e name.`);
      continue;
    }
    if (tagIds.has(tag.id)) errors.push(`O ID de tag "${tag.id}" aparece mais de uma vez.`);
    tagIds.add(tag.id);
  }
  for (const [fileIndex, file] of files.entries()) {
    if (!isRecord(file)) continue;
    for (const [tagIndex, tagId] of asArray(file.tags).entries()) {
      if (!tagIds.has(tagId)) addValidationIssue(errors, issues, `files[${fileIndex}].tags[${tagIndex}]`, tagId, 'reference.tag.exists', `files[${fileIndex}].tags[${tagIndex}] referencia uma tag inexistente.`);
    }
  }

  const relationshipTypeIssues = relationshipTypeValidationIssues(document, SUPPORTED_GLOBAL_RELATIONSHIP_TYPE_KEYS);
  issues.push(...relationshipTypeIssues);
  errors.push(...relationshipTypeIssues.map((issue) => issue.message));

  const relationships = asArray(document.relationships);
  const relationshipIds = new Set<string>();
  const relationshipKeys = new Set<string>();
  for (const [index, relationship] of relationships.entries()) {
    if (!isRecord(relationship)) {
      errors.push(`relationships[${index}] precisa ser um objeto.`);
      continue;
    }
    if (!fileIds.has(relationship.fromId)) addValidationIssue(errors, issues, `relationships[${index}].fromId`, relationship.fromId, 'reference.file.exists', `relationships[${index}].fromId referencia um arquivo inexistente.`);
    if (!fileIds.has(relationship.toId)) addValidationIssue(errors, issues, `relationships[${index}].toId`, relationship.toId, 'reference.file.exists', `relationships[${index}].toId referencia um arquivo inexistente.`);
    if (relationship.fromId === relationship.toId) errors.push(`relationships[${index}] não pode ligar um arquivo a ele mesmo.`);
    if (!hasNonEmptyString(relationship.typeKey) && !RELATIONSHIP_KINDS.includes(relationship.kind)) errors.push(`relationships[${index}] precisa conter typeKey ou um kind legado válido.`);
    if (relationship.typeKey !== undefined && !hasNonEmptyString(relationship.typeKey)) errors.push(`relationships[${index}].typeKey é inválido.`);
    if (relationship.importance !== undefined && !RELATIONSHIP_IMPORTANCES.includes(relationship.importance)) errors.push(`relationships[${index}].importance é inválido.`);
    if (relationship.visibility !== undefined && !RELATIONSHIP_VISIBILITIES.includes(relationship.visibility)) errors.push(`relationships[${index}].visibility é inválido.`);
    validateExportDate(errors, issues, `relationships[${index}].createdAt`, relationship.createdAt);
    if (relationship.updatedAt !== undefined) validateExportDate(errors, issues, `relationships[${index}].updatedAt`, relationship.updatedAt);
    if (relationship.id !== undefined && !hasNonEmptyString(relationship.id)) errors.push(`relationships[${index}].id é inválido.`);
    if (hasNonEmptyString(relationship.id)) {
      if (relationshipIds.has(relationship.id)) errors.push(`O ID de relacionamento "${relationship.id}" aparece mais de uma vez.`);
      relationshipIds.add(relationship.id);
    }
    const relationshipKey = `${relationship.fromId}:${relationship.toId}:${effectiveRelationshipTypeKey(relationship)}`;
    if (relationshipKeys.has(relationshipKey)) errors.push(`relationships[${index}] duplica origem, destino e tipo de outra relação.`);
    relationshipKeys.add(relationshipKey);
  }

  const customSystem = isRecord(document.customSystem) ? document.customSystem : {};
  if (!Array.isArray(customSystem.attributes)) errors.push('customSystem.attributes deve ser uma lista.');
  if (!Array.isArray(customSystem.skills)) errors.push('customSystem.skills deve ser uma lista.');
  if (!Array.isArray(customSystem.classes)) errors.push('customSystem.classes deve ser uma lista.');
  if (!Array.isArray(customSystem.races)) errors.push('customSystem.races deve ser uma lista.');
  const customIds = new Map<string, Set<string>>();
  for (const [kind, items] of Object.entries({
    attributes: asArray(customSystem.attributes),
    skills: asArray(customSystem.skills),
    classes: asArray(customSystem.classes),
    races: asArray(customSystem.races)
  })) {
    const ids = new Set<string>();
    customIds.set(kind, ids);
    for (const [index, item] of items.entries()) {
      if (!isRecord(item) || !hasNonEmptyString(item.id) || !hasNonEmptyString(item.name)) {
        errors.push(`customSystem.${kind}[${index}] precisa conter id e name.`);
        continue;
      }
      if (ids.has(item.id)) errors.push(`O ID "${item.id}" aparece mais de uma vez em customSystem.${kind}.`);
      ids.add(item.id);
    }
  }
  for (const [index, skill] of asArray(customSystem.skills).entries()) {
    if (isRecord(skill) && skill.linkedAttr && !customIds.get('attributes')?.has(skill.linkedAttr)) {
      addValidationIssue(errors, issues, `customSystem.skills[${index}].linkedAttr`, skill.linkedAttr, 'reference.customSystem.attributes', `customSystem.skills[${index}].linkedAttr referencia um atributo inexistente.`);
    }
  }
  if (document.campaign.system === 'CUSTOM') {
    for (const [fileIndex, file] of files.entries()) {
      if (isRecord(file) && isRecord(file.data)) validateCustomSystemDataReferences(file.data, `files[${fileIndex}].data`, customIds, errors, issues);
    }
  }

  const briefing = document.briefing;
  if (briefing !== undefined && briefing !== null) {
    const briefingPath = 'briefing';
    if (!isRecord(briefing)) {
      addValidationIssue(errors, issues, briefingPath, briefing, 'shape.briefing', 'briefing deve ser um objeto quando informado.');
    } else {
      if (!hasNonEmptyString(briefing.title)) addValidationIssue(errors, issues, `${briefingPath}.title`, briefing.title, 'required.briefing.title', 'briefing.title é obrigatório.');
      if (typeof briefing.title === 'string' && briefing.title.trim().length > 160) addValidationIssue(errors, issues, `${briefingPath}.title`, briefing.title, 'max.briefing.title', 'briefing.title pode ter no máximo 160 caracteres.');
      if (!hasNonEmptyString(briefing.body)) addValidationIssue(errors, issues, `${briefingPath}.body`, briefing.body, 'required.briefing.body', 'briefing.body é obrigatório.');
      if (typeof briefing.body === 'string' && briefing.body.trim().length > 20000) addValidationIssue(errors, issues, `${briefingPath}.body`, briefing.body, 'max.briefing.body', 'briefing.body pode ter no máximo 20000 caracteres.');
      if (briefing.isPublished !== undefined && typeof briefing.isPublished !== 'boolean') addValidationIssue(errors, issues, `${briefingPath}.isPublished`, briefing.isPublished, 'boolean.briefing.isPublished', 'briefing.isPublished deve ser booleano.');
      if (briefing.createdAt !== undefined) validateExportDate(errors, issues, `${briefingPath}.createdAt`, briefing.createdAt);
      if (briefing.updatedAt !== undefined) validateExportDate(errors, issues, `${briefingPath}.updatedAt`, briefing.updatedAt);
      if (briefing.isPublished === true) warnings.push('A publicação do briefing será importada desativada e exigirá nova ação do Mestre.');
    }
  }

  const folders = asArray(document.favoriteFolders);
  for (const [index, folder] of folders.entries()) {
    if (!isRecord(folder) || !hasNonEmptyString(folder.name)) errors.push(`favoriteFolders[${index}] precisa conter name.`);
    for (const [entryIndex, entry] of (isRecord(folder) ? asArray(folder.entries) : []).entries()) {
      if (!isRecord(entry) || !fileIds.has(entry.fileId)) addValidationIssue(errors, issues, `favoriteFolders[${index}].entries[${entryIndex}].fileId`, isRecord(entry) ? entry.fileId : entry, 'reference.file.exists', `favoriteFolders[${index}].entries[${entryIndex}].fileId referencia um arquivo inexistente.`);
    }
  }

  const boardViewIds = new Set<string>();
  const investigationHypothesisIds = new Set<string>();
  for (const [index, event] of asArray(document.timelineEvents).entries()) {
    if (!isRecord(event) || !hasNonEmptyString(event.title) || !hasNonEmptyString(event.happenedAt)) {
      errors.push(`timelineEvents[${index}] precisa conter title e happenedAt.`);
    }
    if (isRecord(event)) validateExportDate(errors, issues, `timelineEvents[${index}].happenedAt`, event.happenedAt);
    if (isRecord(event) && event.fileId !== null && event.fileId !== undefined && !fileIds.has(event.fileId)) {
      addValidationIssue(errors, issues, `timelineEvents[${index}].fileId`, event.fileId, 'reference.file.exists', `timelineEvents[${index}].fileId referencia um arquivo inexistente.`);
    }
    if (isRecord(event) && event.isPublished !== undefined && typeof event.isPublished !== 'boolean') addValidationIssue(errors, issues, `timelineEvents[${index}].isPublished`, event.isPublished, 'boolean.timelineEvent.isPublished', `timelineEvents[${index}].isPublished deve ser booleano.`);
  }

  const board = isRecord(document.board) ? document.board : {};
  const boardNodeIds = new Set<string>();
  for (const [index, node] of asArray(board.nodes).entries()) {
    if (!isRecord(node) || !fileIds.has(node.fileId)) addValidationIssue(errors, issues, `board.nodes[${index}].fileId`, isRecord(node) ? node.fileId : node, 'reference.file.exists', `board.nodes[${index}].fileId referencia um arquivo inexistente.`);
    if (isRecord(node) && boardNodeIds.has(node.fileId)) errors.push(`O arquivo "${node.fileId}" aparece duas vezes no quadro.`);
    if (isRecord(node)) boardNodeIds.add(node.fileId);
  }
  for (const [index, edge] of asArray(board.edges).entries()) {
    if (!isRecord(edge) || !boardNodeIds.has(edge.fromFileId) || !boardNodeIds.has(edge.toFileId)) {
      addValidationIssue(errors, issues, `board.edges[${index}]`, edge, 'reference.boardNode.exists', `board.edges[${index}] referencia um nó inexistente.`);
    }
    if (isRecord(edge) && edge.curve !== undefined && (!Number.isFinite(edge.curve) || edge.curve < -180 || edge.curve > 180)) {
      addValidationIssue(errors, issues, `board.edges[${index}].curve`, edge.curve, 'range.boardEdge.curve', `board.edges[${index}].curve precisa ser um número entre -180 e 180.`);
    }
  }

  for (const [index, pin] of asArray(board.pins).entries()) {
    const path = `board.pins[${index}]`;
    if (!isRecord(pin) || !hasNonEmptyString(pin.text)) addValidationIssue(errors, issues, `${path}.text`, isRecord(pin) ? pin.text : pin, 'required.boardPin.text', `${path}.text é obrigatório.`);
    if (isRecord(pin) && typeof pin.text === 'string' && pin.text.trim().length > 280) addValidationIssue(errors, issues, `${path}.text`, pin.text, 'max.boardPin.text', `${path}.text pode ter no máximo 280 caracteres.`);
    if (!isRecord(pin) || !Number.isFinite(pin.x) || Math.abs(pin.x) > 100000) addValidationIssue(errors, issues, `${path}.x`, isRecord(pin) ? pin.x : pin, 'range.boardPin.x', `${path}.x está fora do intervalo permitido.`);
    if (!isRecord(pin) || !Number.isFinite(pin.y) || Math.abs(pin.y) > 100000) addValidationIssue(errors, issues, `${path}.y`, isRecord(pin) ? pin.y : pin, 'range.boardPin.y', `${path}.y está fora do intervalo permitido.`);
    if (!isRecord(pin) || !BOARD_ANNOTATION_COLOR.test(pin.color)) addValidationIssue(errors, issues, `${path}.color`, isRecord(pin) ? pin.color : pin, 'format.boardPin.color', `${path}.color precisa estar no formato hexadecimal #RRGGBB.`);
  }

  for (const [index, group] of asArray(board.groups).entries()) {
    const path = `board.groups[${index}]`;
    if (!isRecord(group) || !hasNonEmptyString(group.name)) addValidationIssue(errors, issues, `${path}.name`, isRecord(group) ? group.name : group, 'required.boardGroup.name', `${path}.name é obrigatório.`);
    if (isRecord(group) && typeof group.name === 'string' && group.name.trim().length > 120) addValidationIssue(errors, issues, `${path}.name`, group.name, 'max.boardGroup.name', `${path}.name pode ter no máximo 120 caracteres.`);
    if (!isRecord(group) || !BOARD_ANNOTATION_COLOR.test(group.color)) addValidationIssue(errors, issues, `${path}.color`, isRecord(group) ? group.color : group, 'format.boardGroup.color', `${path}.color precisa estar no formato hexadecimal #RRGGBB.`);
    for (const [field, value] of [['x', isRecord(group) ? group.x : undefined], ['y', isRecord(group) ? group.y : undefined]] as const) {
      if (!Number.isFinite(value) || Math.abs(value) > 100000) addValidationIssue(errors, issues, `${path}.${field}`, value, `range.boardGroup.${field}`, `${path}.${field} está fora do intervalo permitido.`);
    }
    for (const [field, value] of [['width', isRecord(group) ? group.width : undefined], ['height', isRecord(group) ? group.height : undefined]] as const) {
      if (!Number.isFinite(value) || value < 80 || value > 5000) addValidationIssue(errors, issues, `${path}.${field}`, value, `range.boardGroup.${field}`, `${path}.${field} precisa estar entre 80 e 5000.`);
    }
    if (!isRecord(group) || !Array.isArray(group.fileIds)) {
      addValidationIssue(errors, issues, `${path}.fileIds`, isRecord(group) ? group.fileIds : group, 'shape.boardGroup.fileIds', `${path}.fileIds deve ser uma lista.`);
    } else {
      const groupFileIds = new Set<string>();
      for (const [fileIndex, fileId] of group.fileIds.entries()) {
        if (typeof fileId !== 'string' || !boardNodeIds.has(fileId)) addValidationIssue(errors, issues, `${path}.fileIds[${fileIndex}]`, fileId, 'reference.boardNode.exists', `${path}.fileIds[${fileIndex}] referencia um nó inexistente.`);
        if (groupFileIds.has(fileId)) addValidationIssue(errors, issues, `${path}.fileIds[${fileIndex}]`, fileId, 'unique.boardGroup.fileId', `${path}.fileIds[${fileIndex}] aparece mais de uma vez.`);
        groupFileIds.add(fileId);
      }
    }
  }

  const viewNames = new Set<string>();
  for (const [index, view] of asArray(board.views).entries()) {
    const path = `board.views[${index}]`;
    if (!isRecord(view)) {
      addValidationIssue(errors, issues, path, view, 'shape.boardView', `${path} precisa ser um objeto.`);
      continue;
    }
    if (view.id !== undefined && !hasNonEmptyString(view.id)) addValidationIssue(errors, issues, `${path}.id`, view.id, 'format.boardView.id', `${path}.id é inválido.`);
    if (hasNonEmptyString(view.id)) {
      if (boardViewIds.has(view.id)) addValidationIssue(errors, issues, `${path}.id`, view.id, 'unique.boardView.id', `${path}.id aparece mais de uma vez.`);
      boardViewIds.add(view.id);
    }
    if (!hasNonEmptyString(view.name)) addValidationIssue(errors, issues, `${path}.name`, view.name, 'required.boardView.name', `${path}.name é obrigatório.`);
    if (typeof view.name === 'string' && view.name.trim().length > 120) addValidationIssue(errors, issues, `${path}.name`, view.name, 'max.boardView.name', `${path}.name pode ter no máximo 120 caracteres.`);
    const normalizedName = typeof view.name === 'string' ? view.name.trim().toLocaleLowerCase() : '';
    if (normalizedName && viewNames.has(normalizedName)) addValidationIssue(errors, issues, `${path}.name`, view.name, 'unique.boardView.name', `${path}.name duplica outra vista.`);
    if (normalizedName) viewNames.add(normalizedName);
    if (!BOARD_VIEW_KINDS.has(view.kind)) addValidationIssue(errors, issues, `${path}.kind`, view.kind, 'enum.boardView.kind', `${path}.kind contém um tipo inválido.`);
    if (view.description !== null && view.description !== undefined && (typeof view.description !== 'string' || view.description.trim().length > 1000)) addValidationIssue(errors, issues, `${path}.description`, view.description, 'max.boardView.description', `${path}.description é inválida ou muito longa.`);
    if (!Number.isInteger(view.order) || view.order < 0) addValidationIssue(errors, issues, `${path}.order`, view.order, 'range.boardView.order', `${path}.order precisa ser um inteiro não negativo.`);
    validateBoardViewSnapshot(errors, issues, `${path}.snapshot`, view.snapshot, asArray(board.pins).length, asArray(board.groups).length);
  }

  const playerMode = isRecord(document.playerMode) ? document.playerMode : {};
  if (playerMode.isEnabled === true) warnings.push('O Modo Jogador será importado desligado por segurança.');
  const visibilityFileIds = new Set<string>();
  for (const [index, visibility] of asArray(playerMode.visibility).entries()) {
    if (!isRecord(visibility) || !fileIds.has(visibility.fileId)) addValidationIssue(errors, issues, `playerMode.visibility[${index}].fileId`, isRecord(visibility) ? visibility.fileId : visibility, 'reference.file.exists', `playerMode.visibility[${index}].fileId referencia um arquivo inexistente.`);
    if (isRecord(visibility) && visibilityFileIds.has(visibility.fileId)) addValidationIssue(errors, issues, `playerMode.visibility[${index}].fileId`, visibility.fileId, 'unique.playerModeVisibility.fileId', `playerMode.visibility[${index}].fileId aparece mais de uma vez.`);
    if (isRecord(visibility)) visibilityFileIds.add(visibility.fileId);
  }

  const investigation = document.investigation;
  if (investigation !== undefined) {
    if (!isRecord(investigation) || !Array.isArray(investigation.hypotheses)) {
      addValidationIssue(errors, issues, 'investigation.hypotheses', investigation, 'shape.investigation.hypotheses', 'investigation.hypotheses deve ser uma lista quando informada.');
    } else {
      const hypothesisIds = investigationHypothesisIds;
      for (const [hypothesisIndex, hypothesis] of investigation.hypotheses.entries()) {
        const hypothesisPath = `investigation.hypotheses[${hypothesisIndex}]`;
        if (!isRecord(hypothesis)) {
          addValidationIssue(errors, issues, hypothesisPath, hypothesis, 'shape.investigation.hypothesis', `${hypothesisPath} precisa ser um objeto.`);
          continue;
        }
        if (!hasNonEmptyString(hypothesis.title)) addValidationIssue(errors, issues, `${hypothesisPath}.title`, hypothesis.title, 'required.investigation.hypothesis.title', `${hypothesisPath}.title é obrigatório.`);
        if (typeof hypothesis.title === 'string' && hypothesis.title.trim().length > 200) addValidationIssue(errors, issues, `${hypothesisPath}.title`, hypothesis.title, 'max.investigation.hypothesis.title', `${hypothesisPath}.title pode ter no máximo 200 caracteres.`);
        if (hypothesis.summary !== undefined && hypothesis.summary !== null && (typeof hypothesis.summary !== 'string' || hypothesis.summary.trim().length > 4000)) addValidationIssue(errors, issues, `${hypothesisPath}.summary`, hypothesis.summary, 'max.investigation.hypothesis.summary', `${hypothesisPath}.summary é inválido ou muito longo.`);
        if (!HYPOTHESIS_STATUSES.has(hypothesis.status)) addValidationIssue(errors, issues, `${hypothesisPath}.status`, hypothesis.status, 'enum.investigation.hypothesis.status', `${hypothesisPath}.status contém um estado inválido.`);
        validateExportDate(errors, issues, `${hypothesisPath}.createdAt`, hypothesis.createdAt);
        validateExportDate(errors, issues, `${hypothesisPath}.updatedAt`, hypothesis.updatedAt);
        if (hypothesis.id !== undefined && !hasNonEmptyString(hypothesis.id)) addValidationIssue(errors, issues, `${hypothesisPath}.id`, hypothesis.id, 'id.investigation.hypothesis', `${hypothesisPath}.id é inválido.`);
        if (hasNonEmptyString(hypothesis.id)) {
          if (hypothesisIds.has(hypothesis.id)) addValidationIssue(errors, issues, `${hypothesisPath}.id`, hypothesis.id, 'unique.investigation.hypothesis.id', `${hypothesisPath}.id aparece mais de uma vez.`);
          hypothesisIds.add(hypothesis.id);
        }
        if (!Array.isArray(hypothesis.evidence)) {
          addValidationIssue(errors, issues, `${hypothesisPath}.evidence`, hypothesis.evidence, 'shape.investigation.hypothesis.evidence', `${hypothesisPath}.evidence deve ser uma lista.`);
          continue;
        }
        const evidenceFileIds = new Set<string>();
        const evidenceIds = new Set<string>();
        for (const [evidenceIndex, evidence] of hypothesis.evidence.entries()) {
          const evidencePath = `${hypothesisPath}.evidence[${evidenceIndex}]`;
          if (!isRecord(evidence)) {
            addValidationIssue(errors, issues, evidencePath, evidence, 'shape.investigation.evidence', `${evidencePath} precisa ser um objeto.`);
            continue;
          }
          if (!hasNonEmptyString(evidence.fileId)) addValidationIssue(errors, issues, `${evidencePath}.fileId`, evidence.fileId, 'required.investigation.evidence.fileId', `${evidencePath}.fileId é obrigatório.`);
          else {
            if (!fileIds.has(evidence.fileId)) addValidationIssue(errors, issues, `${evidencePath}.fileId`, evidence.fileId, 'reference.file.exists', `${evidencePath}.fileId referencia um arquivo inexistente.`);
            if (evidenceFileIds.has(evidence.fileId)) addValidationIssue(errors, issues, `${evidencePath}.fileId`, evidence.fileId, 'unique.investigation.evidence.fileId', `${evidencePath}.fileId aparece mais de uma vez na mesma hipótese.`);
            evidenceFileIds.add(evidence.fileId);
          }
          if (!EVIDENCE_STANCES.has(evidence.stance)) addValidationIssue(errors, issues, `${evidencePath}.stance`, evidence.stance, 'enum.investigation.evidence.stance', `${evidencePath}.stance contém uma posição inválida.`);
          if (evidence.note !== undefined && evidence.note !== null && (typeof evidence.note !== 'string' || evidence.note.trim().length > 1000)) addValidationIssue(errors, issues, `${evidencePath}.note`, evidence.note, 'max.investigation.evidence.note', `${evidencePath}.note é inválida ou muito longa.`);
          if (!Number.isInteger(evidence.order) || evidence.order < 0) addValidationIssue(errors, issues, `${evidencePath}.order`, evidence.order, 'range.investigation.evidence.order', `${evidencePath}.order precisa ser um inteiro não negativo.`);
          validateExportDate(errors, issues, `${evidencePath}.createdAt`, evidence.createdAt);
          if (evidence.updatedAt !== undefined) validateExportDate(errors, issues, `${evidencePath}.updatedAt`, evidence.updatedAt);
          if (evidence.id !== undefined && !hasNonEmptyString(evidence.id)) addValidationIssue(errors, issues, `${evidencePath}.id`, evidence.id, 'id.investigation.evidence', `${evidencePath}.id é inválido.`);
          if (hasNonEmptyString(evidence.id)) {
            if (evidenceIds.has(evidence.id)) addValidationIssue(errors, issues, `${evidencePath}.id`, evidence.id, 'unique.investigation.evidence.id', `${evidencePath}.id aparece mais de uma vez na hipótese.`);
            evidenceIds.add(evidence.id);
          }
        }
      }
    }
  }

  const sessionIds = new Set<string>();
  for (const [index, session] of asArray(document.sessions).entries()) {
    const path = `sessions[${index}]`;
    if (!isRecord(session) || !hasNonEmptyString(session.name)) errors.push(`${path} precisa conter name.`);
    if (!isRecord(session)) continue;
    if (session.id !== undefined && !hasNonEmptyString(session.id)) addValidationIssue(errors, issues, `${path}.id`, session.id, 'format.session.id', `${path}.id é inválido.`);
    if (hasNonEmptyString(session.id)) {
      if (sessionIds.has(session.id)) addValidationIssue(errors, issues, `${path}.id`, session.id, 'unique.session.id', `${path}.id aparece mais de uma vez.`);
      sessionIds.add(session.id);
    }
    validateExportDate(errors, issues, `${path}.date`, session.date, { nullable: true });
    if (session.summary !== undefined && session.summary !== null && (typeof session.summary !== 'string' || session.summary.trim().length > 4000)) addValidationIssue(errors, issues, `${path}.summary`, session.summary, 'max.session.summary', `${path}.summary é inválido ou muito longo.`);
    if (session.postSummary !== undefined && session.postSummary !== null && (typeof session.postSummary !== 'string' || session.postSummary.trim().length > 20000)) addValidationIssue(errors, issues, `${path}.postSummary`, session.postSummary, 'max.session.postSummary', `${path}.postSummary é inválido ou muito longo.`);
    if (!Number.isInteger(session.order) || session.order < 0) addValidationIssue(errors, issues, `${path}.order`, session.order, 'range.session.order', `${path}.order precisa ser um inteiro não negativo.`);
    if (session.status !== undefined && !SESSION_PLANNING_STATUSES.has(session.status)) addValidationIssue(errors, issues, `${path}.status`, session.status, 'enum.session.status', `${path}.status contém um estado inválido.`);
    if (session.completedAt !== undefined) validateExportDate(errors, issues, `${path}.completedAt`, session.completedAt, { nullable: true });
    validateSessionPlanItems(errors, issues, `${path}.checklist`, session.checklist);
    validateSessionPlanItems(errors, issues, `${path}.objectives`, session.objectives);
    validateSessionPlanItems(errors, issues, `${path}.agenda`, session.agenda);
    for (const [fileIndex, fileId] of asArray(session.fileIds).entries()) {
      if (!fileIds.has(fileId)) addValidationIssue(errors, issues, `${path}.fileIds[${fileIndex}]`, fileId, 'reference.file.exists', `${path}.fileIds[${fileIndex}] referencia um arquivo inexistente.`);
    }
    validateSessionIdList(errors, issues, `${path}.hypothesisIds`, session.hypothesisIds, investigationHypothesisIds, 'reference.session.hypothesis.exists');
    validateSessionIdList(errors, issues, `${path}.viewIds`, session.viewIds, boardViewIds, 'reference.session.view.exists');
  }

  return { valid: errors.length === 0, errors, issues, warnings, summary };
}

type ExportSource = Awaited<ReturnType<typeof loadExportSource>>;

async function loadExportSource(campaignId: string, ownerId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, ownerId },
    include: {
      attributes: { orderBy: { order: 'asc' } },
      skills: { orderBy: { order: 'asc' } },
      classes: { orderBy: { name: 'asc' } },
      races: { orderBy: { name: 'asc' } },
      files: {
        orderBy: { createdAt: 'asc' },
        include: {
          tags: { include: { tag: true } },
          attachments: { orderBy: { createdAt: 'asc' } },
          comments: { orderBy: { createdAt: 'asc' } },
          history: { orderBy: { createdAt: 'asc' } },
          playerVisibility: true
        }
      },
      tags: { orderBy: { name: 'asc' } },
      favoriteFolders: {
        orderBy: { order: 'asc' },
        include: { entries: { orderBy: { order: 'asc' } } }
      },
      sessions: {
        orderBy: { order: 'asc' },
        include: {
          files: true,
          hypothesisLinks: { orderBy: { hypothesis: { title: 'asc' } }, include: { hypothesis: { select: { id: true } } } },
          boardViewLinks: { orderBy: { view: { order: 'asc' } }, include: { view: { select: { id: true } } } }
        }
      },
      timelineEvents: { orderBy: [{ happenedAt: 'asc' }, { order: 'asc' }] },
      boardNodes: true,
      boardEdges: { include: { fromNode: true, toNode: true } },
      investigationBoardPins: { orderBy: { createdAt: 'asc' } },
      investigationBoardGroups: { orderBy: { createdAt: 'asc' }, include: { items: { orderBy: { createdAt: 'asc' }, include: { boardNode: { select: { fileId: true } } } } } },
      investigationBoardViews: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      playerModeConfig: true,
      briefing: true,
      hypotheses: {
        orderBy: { createdAt: 'asc' },
        include: {
          evidence: {
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: { file: { select: { id: true } } }
          }
        }
      }
    }
  });
  if (!campaign) return null;
  const [relationships, relationshipTypes] = await Promise.all([
    prisma.relationship.findMany({ where: { campaignId }, include: { type: true }, orderBy: { createdAt: 'asc' } }),
    prisma.relationshipType.findMany({ where: { OR: [{ campaignId: null }, { campaignId }] }, orderBy: [{ campaignId: 'asc' }, { name: 'asc' }] })
  ]);
  return { campaign, relationships, relationshipTypes };
}

async function getExportSource(campaignId: string) {
  const access = await assertCampaignRole(campaignId, 'OWNER');
  return loadExportSource(campaignId, access.user.id);
}

function buildExportDocument(source: NonNullable<ExportSource>): CampaignExportDocument {
  const { campaign, relationships, relationshipTypes } = source;
  const files = campaign.files.map((file) => ({
    id: file.id,
    type: file.type,
    name: file.name,
    description: file.description,
    content: file.content,
    authorId: file.authorId,
    data: (file.data ?? {}) as Record<string, unknown>,
    isFavorite: file.isFavorite,
    isArchived: file.isArchived,
    isTrashed: file.isTrashed,
    trashedAt: file.trashedAt?.toISOString() ?? null,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
    tags: file.tags.map(({ tag }) => tag.id),
    attachments: file.attachments.map((attachment) => ({
      url: attachment.url,
      label: attachment.label,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString()
    })),
    comments: file.comments.map((comment) => ({
      authorId: comment.authorId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString()
    })),
    history: file.history.map((entry) => ({
      action: entry.action,
      summary: entry.summary,
      authorId: entry.authorId,
      createdAt: entry.createdAt.toISOString()
    }))
  }));
  const nodeIdToFileId = new Map(campaign.boardNodes.map((node) => [node.id, node.fileId]));
  const pinIndexById = new Map(campaign.investigationBoardPins.map((pin, index) => [pin.id, index]));
  const groupIndexById = new Map(campaign.investigationBoardGroups.map((group, index) => [group.id, index]));
  const exportViewSnapshot = (snapshot: unknown): CampaignExportBoardView['snapshot'] => {
    const source = isRecord(snapshot) ? snapshot : {};
    const { pinIds: sourcePinIds, groupIds: sourceGroupIds, ...navigation } = source;
    const pinIndexes = asArray(sourcePinIds).filter((id): id is string => typeof id === 'string' && pinIndexById.has(id)).map((id) => pinIndexById.get(id)!);
    const groupIndexes = asArray(sourceGroupIds).filter((id): id is string => typeof id === 'string' && groupIndexById.has(id)).map((id) => groupIndexById.get(id)!);
    return { ...navigation, pinIndexes, groupIndexes } as CampaignExportBoardView['snapshot'];
  };

  return {
    format: 'rpg-campaign-studio',
    version: 1,
    exportedAt: new Date().toISOString(),
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      system: campaign.system,
      coverImage: campaign.coverImage
    },
    customSystem: {
      attributes: campaign.attributes.map((item) => ({ ...item, id: item.id })),
      skills: campaign.skills.map((item) => ({ ...item, id: item.id })),
      classes: campaign.classes.map((item) => ({ ...item, id: item.id })),
      races: campaign.races.map((item) => ({ ...item, id: item.id }))
    },
    files,
    tags: campaign.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description
    })),
    relationships: relationships.map((relationship) => ({
      id: relationship.id,
      fromId: relationship.fromId,
      toId: relationship.toId,
      kind: relationship.kind,
      typeKey: relationship.type.key,
      label: relationship.label,
      description: relationship.description,
      importance: relationship.importance,
      visibility: relationship.visibility,
      createdAt: relationship.createdAt.toISOString(),
      updatedAt: relationship.updatedAt.toISOString()
    })),
    relationshipTypes: relationshipTypes.map((relationshipType) => ({ id: relationshipType.id, scope: relationshipType.campaignId ? 'CAMPAIGN' as const : 'GLOBAL' as const, key: relationshipType.key, name: relationshipType.name, description: relationshipType.description, directional: relationshipType.directional, color: relationshipType.color, icon: relationshipType.icon })),
    favoriteFolders: campaign.favoriteFolders.map((folder) => ({
      name: folder.name,
      icon: folder.icon,
      color: folder.color,
      order: folder.order,
      isCollapsed: folder.isCollapsed,
      entries: folder.entries.map((entry) => ({ fileId: entry.fileId, order: entry.order }))
    })),
    briefing: campaign.briefing ? {
      title: campaign.briefing.title,
      body: campaign.briefing.body,
      isPublished: campaign.briefing.isPublished,
      createdAt: campaign.briefing.createdAt.toISOString(),
      updatedAt: campaign.briefing.updatedAt.toISOString()
    } : null,
    sessions: campaign.sessions.map((session) => ({
      id: session.id,
      name: session.name,
      date: session.date?.toISOString() ?? null,
      summary: session.summary,
      checklist: session.checklist,
      objectives: session.objectives ?? [],
      agenda: session.agenda ?? [],
      postSummary: session.postSummary ?? null,
      status: session.status ?? 'PLANNED',
      completedAt: session.completedAt?.toISOString() ?? null,
      order: session.order,
      fileIds: session.files.map((link) => link.fileId),
      hypothesisIds: (session.hypothesisLinks ?? []).map((link) => link.hypothesis.id),
      viewIds: (session.boardViewLinks ?? []).map((link) => link.view.id)
    })),
    timelineEvents: campaign.timelineEvents.map((event) => ({
      title: event.title,
      happenedAt: event.happenedAt.toISOString(),
      order: event.order,
      fileId: event.fileId,
      isPublished: event.isPublished
    })),
    board: {
      nodes: campaign.boardNodes.map((node) => ({ fileId: node.fileId, x: node.x, y: node.y })),
      edges: campaign.boardEdges.map((edge) => ({
        fromFileId: nodeIdToFileId.get(edge.fromNodeId) ?? '',
        toFileId: nodeIdToFileId.get(edge.toNodeId) ?? '',
        label: edge.label,
        color: edge.color,
        description: edge.description,
        curve: edge.curve
      })),
      pins: campaign.investigationBoardPins.map((pin) => ({ text: pin.text, x: pin.x, y: pin.y, color: pin.color })),
      groups: campaign.investigationBoardGroups.map((group) => ({ name: group.name, color: group.color, x: group.x, y: group.y, width: group.width, height: group.height, fileIds: group.items.map((item) => item.boardNode.fileId) })),
      views: (campaign.investigationBoardViews ?? []).map((view) => ({ id: view.id, name: view.name, kind: view.kind, description: view.description, order: view.order, snapshot: exportViewSnapshot(view.snapshot) }))
    },
    playerMode: {
      isEnabled: campaign.playerModeConfig?.isEnabled ?? false,
      visibility: campaign.files
        .filter((file) => file.playerVisibility)
        .map((file) => ({ fileId: file.id, isVisible: file.playerVisibility?.isVisible ?? false }))
    },
    investigation: {
      hypotheses: campaign.hypotheses.map((hypothesis) => ({
        id: hypothesis.id,
        title: hypothesis.title,
        summary: hypothesis.summary,
        status: hypothesis.status,
        createdAt: hypothesis.createdAt.toISOString(),
        updatedAt: hypothesis.updatedAt.toISOString(),
        evidence: hypothesis.evidence.map((evidence) => ({
          id: evidence.id,
          fileId: evidence.file.id,
          stance: evidence.stance,
          note: evidence.note,
          order: evidence.order,
          createdAt: evidence.createdAt.toISOString(),
          updatedAt: evidence.updatedAt.toISOString()
        }))
      }))
    }
  };
}

export async function exportCampaign(campaignId: string): Promise<CampaignExportDocument> {
  const source = await getExportSource(campaignId);
  if (!source) throw new Error('Campanha não encontrada.');
  return buildExportDocument(source);
}

export async function exportCampaignAsOwner(campaignId: string, ownerId: string): Promise<CampaignExportDocument> {
  const source = await loadExportSource(campaignId, ownerId);
  if (!source) throw new Error('Campanha não encontrada.');
  return buildExportDocument(source);
}

export function dryRunCampaignImport(input: unknown, options: { identityMode?: CampaignImportIdentityMode } = {}): CampaignImportDryRun {
  const identityMode = options.identityMode ?? 'REMAP';
  const validation = validateCampaignExportDocument(input);
  const document = isRecord(input) ? input : {};
  const customSystem = isRecord(document.customSystem) ? document.customSystem : {};
  return {
    canImport: validation.valid,
    identityMode,
    validation,
    identityPlan: {
      strategy: identityMode === 'REMAP' ? 'REMAP_ALL' : 'PRESERVE_WHEN_AVAILABLE',
      campaignId: identityMode === 'REMAP' ? 'REMAP' : 'PRESERVE_WHEN_AVAILABLE',
      files: asArray(document.files).length,
      tags: asArray(document.tags).length,
      relationshipTypes: asArray(document.relationshipTypes).length,
      relationships: asArray(document.relationships).length,
      hypotheses: asArray(isRecord(document.investigation) ? document.investigation.hypotheses : undefined).length,
      hypothesisEvidence: asArray(isRecord(document.investigation) ? document.investigation.hypotheses : undefined).reduce((total, hypothesis) => total + (isRecord(hypothesis) ? asArray(hypothesis.evidence).length : 0), 0),
      boardPins: asArray(isRecord(document.board) ? document.board.pins : undefined).length,
      boardGroups: asArray(isRecord(document.board) ? document.board.groups : undefined).length,
      boardViews: asArray(isRecord(document.board) ? document.board.views : undefined).length,
      sessions: asArray(document.sessions).length,
      sessionHypothesisLinks: asArray(document.sessions).reduce((total, session) => total + (isRecord(session) ? asArray(session.hypothesisIds).length : 0), 0),
      sessionBoardViewLinks: asArray(document.sessions).reduce((total, session) => total + (isRecord(session) ? asArray(session.viewIds).length : 0), 0),
      customSystemEntities: asArray(customSystem.attributes).length + asArray(customSystem.skills).length + asArray(customSystem.classes).length + asArray(customSystem.races).length
    }
  };
}

export async function importCampaign(ownerId: string, input: unknown, options: { identityMode?: CampaignImportIdentityMode } = {}) {
  const dryRun = dryRunCampaignImport(input, options);
  const validation = dryRun.validation;
  if (!validation.valid) throw new CampaignTransferError(validation);
  const document = input as CampaignExportDocument;
  const preserveIds = options.identityMode === 'PRESERVE_WHEN_AVAILABLE';

  const created = await prisma.$transaction(async (tx) => {
    const globalRelationshipTypes = await tx.relationshipType.findMany({ where: { campaignId: null } });
    const globalValidationIssues = relationshipTypeValidationIssues(document, new Set(globalRelationshipTypes.map((relationshipType) => relationshipType.key)));
    if (globalValidationIssues.length > 0) {
      throw new CampaignTransferError({
        valid: false,
        errors: globalValidationIssues.map((issue) => issue.message),
        issues: globalValidationIssues,
        warnings: [],
        summary: validation.summary
      });
    }

    const sourceCustomSystem = document.customSystem;
    const sourceRelationshipTypes = document.relationshipTypes ?? [];
    const sourceHypotheses = document.investigation?.hypotheses ?? [];
    const sourceSessions = document.sessions ?? [];
    const sourceBoardPins = document.board.pins ?? [];
    const sourceBoardGroups = document.board.groups ?? [];
    const sourceBoardViews = document.board.views ?? [];
    const occupied = preserveIds
      ? await Promise.all([
          tx.campaign.findUnique({ where: { id: document.campaign.id }, select: { id: true } }),
          tx.campaignAttribute.findMany({ where: { id: { in: sourceCustomSystem.attributes.map((item) => item.id) } }, select: { id: true } }),
          tx.campaignSkill.findMany({ where: { id: { in: sourceCustomSystem.skills.map((item) => item.id) } }, select: { id: true } }),
          tx.campaignClass.findMany({ where: { id: { in: sourceCustomSystem.classes.map((item) => item.id) } }, select: { id: true } }),
          tx.campaignRace.findMany({ where: { id: { in: sourceCustomSystem.races.map((item) => item.id) } }, select: { id: true } }),
          tx.tag.findMany({ where: { id: { in: document.tags.map((item) => item.id) } }, select: { id: true } }),
          tx.campaignFile.findMany({ where: { id: { in: document.files.map((item) => item.id) } }, select: { id: true } }),
          tx.session.findMany({ where: { id: { in: sourceSessions.flatMap((item) => item.id ? [item.id] : []) } }, select: { id: true } }),
          tx.investigationBoardView.findMany({ where: { id: { in: sourceBoardViews.flatMap((item) => item.id ? [item.id] : []) } }, select: { id: true } }),
          tx.relationshipType.findMany({ where: { id: { in: sourceRelationshipTypes.flatMap((item) => item.id ? [item.id] : []) } }, select: { id: true } }),
          tx.relationship.findMany({ where: { id: { in: document.relationships.flatMap((item) => item.id ? [item.id] : []) } }, select: { id: true } }),
          tx.investigationHypothesis.findMany({ where: { id: { in: sourceHypotheses.flatMap((item) => item.id ? [item.id] : []) } }, select: { id: true } }),
          tx.hypothesisEvidence.findMany({ where: { id: { in: sourceHypotheses.flatMap((item) => item.evidence.flatMap((evidence) => evidence.id ? [evidence.id] : [])) } }, select: { id: true } })
        ])
      : [null, [], [], [], [], [], [], [], [], [], [], [], []] as const;
    const [occupiedCampaign, occupiedAttributes, occupiedSkills, occupiedClasses, occupiedRaces, occupiedTags, occupiedFiles, occupiedSessions, occupiedBoardViews, occupiedRelationshipTypes, occupiedRelationships, occupiedHypotheses, occupiedHypothesisEvidence] = occupied;
    const availableId = (id: string | undefined, existing: ReadonlyArray<{ id: string }> | null) => preserveIds && id && !existing?.some((item) => item.id === id) ? id : undefined;

    await tx.user.upsert({
      where: { id: ownerId },
      update: {},
      create: { id: ownerId, name: 'Mestre', email: `${ownerId}@rpgcampaignstudio.local` }
    });

    const campaign = await tx.campaign.create({
      data: {
        ...(availableId(document.campaign.id, occupiedCampaign ? [occupiedCampaign] : []) ? { id: document.campaign.id } : {}),
        name: document.campaign.name,
        description: document.campaign.description,
        system: document.campaign.system,
        coverImage: document.campaign.coverImage,
        ownerId
      }
    });

    const attributeIds = new Map<string, string>();
    const skillIds = new Map<string, string>();
    const classIds = new Map<string, string>();
    const raceIds = new Map<string, string>();
    for (const attribute of document.customSystem.attributes) {
      const createdAttribute = await tx.campaignAttribute.create({
        data: {
          ...(availableId(attribute.id, occupiedAttributes) ? { id: attribute.id } : {}),
          campaignId: campaign.id,
          name: attribute.name,
          shortLabel: attribute.shortLabel,
          min: attribute.min,
          max: attribute.max,
          defaultVal: attribute.defaultVal,
          order: attribute.order
        }
      });
      attributeIds.set(attribute.id, createdAttribute.id);
    }
    for (const skill of document.customSystem.skills) {
      const createdSkill = await tx.campaignSkill.create({
        data: {
          ...(availableId(skill.id, occupiedSkills) ? { id: skill.id } : {}),
          campaignId: campaign.id,
          name: skill.name,
          linkedAttr: skill.linkedAttr ? attributeIds.get(skill.linkedAttr) ?? skill.linkedAttr : null,
          order: skill.order
        }
      });
      skillIds.set(skill.id, createdSkill.id);
    }
    for (const item of document.customSystem.classes) {
      const createdClass = await tx.campaignClass.create({ data: { ...(availableId(item.id, occupiedClasses) ? { id: item.id } : {}), campaignId: campaign.id, name: item.name, description: item.description } });
      classIds.set(item.id, createdClass.id);
    }
    for (const item of document.customSystem.races) {
      const createdRace = await tx.campaignRace.create({ data: { ...(availableId(item.id, occupiedRaces) ? { id: item.id } : {}), campaignId: campaign.id, name: item.name, description: item.description } });
      raceIds.set(item.id, createdRace.id);
    }

    const tagIds = new Map<string, string>();
    for (const tag of document.tags) {
      const createdTag = await tx.tag.create({
        data: {
          ...(availableId(tag.id, occupiedTags) ? { id: tag.id } : {}),
          campaignId: campaign.id,
          name: tag.name,
          color: tag.color,
          icon: tag.icon,
          description: tag.description
        }
      });
      tagIds.set(tag.id, createdTag.id);
    }

    const relationshipTypeIds = new Map(globalRelationshipTypes.map((relationshipType) => [relationshipType.key, relationshipType.id]));
    for (const relationshipType of sourceRelationshipTypes) {
      const key = relationshipType.key.trim().toUpperCase();
      if (relationshipType.scope === 'GLOBAL') continue;
      const createdType = await tx.relationshipType.create({ data: { ...(availableId(relationshipType.id, occupiedRelationshipTypes) ? { id: relationshipType.id } : {}), campaignId: campaign.id, key, name: relationshipType.name, description: relationshipType.description, directional: relationshipType.directional, color: relationshipType.color, icon: relationshipType.icon } });
      relationshipTypeIds.set(key, createdType.id);
    }

    const fileIds = new Map<string, string>();
    for (const [fileIndex, file] of document.files.entries()) {
      const createdFile = await tx.campaignFile.create({
        data: {
          ...(availableId(file.id, occupiedFiles) ? { id: file.id } : {}),
          campaignId: campaign.id,
          type: file.type,
          name: file.name,
          description: file.description,
          content: file.content,
          data: remapCustomSystemData(file.data, { attributeIds, skillIds, classIds, raceIds }) as Prisma.InputJsonValue,
          authorId: file.authorId ?? ownerId,
          isFavorite: file.isFavorite,
          isArchived: file.isArchived,
          isTrashed: file.isTrashed,
          trashedAt: file.trashedAt ? dateFromValidated(file.trashedAt, `files[${fileIndex}].trashedAt`) : null,
          tags: {
            create: file.tags
              .map((tagId) => tagIds.get(tagId))
              .filter((tagId): tagId is string => Boolean(tagId))
              .map((tagId) => ({ tagId }))
          },
          attachments: {
            create: file.attachments.map((attachment, attachmentIndex) => ({
              url: attachment.url,
              label: attachment.label,
              mimeType: attachment.mimeType,
              createdAt: dateFromValidated(attachment.createdAt, `files[${fileIndex}].attachments[${attachmentIndex}].createdAt`)
            }))
          },
            comments: {
            create: file.comments.map((comment, commentIndex) => ({
              authorId: comment.authorId ?? ownerId,
              body: comment.body,
              createdAt: dateFromValidated(comment.createdAt, `files[${fileIndex}].comments[${commentIndex}].createdAt`)
            }))
          },
          history: {
            create: file.history.map((entry, historyIndex) => ({
              action: entry.action,
              summary: entry.summary,
              authorId: entry.authorId ?? ownerId,
              createdAt: dateFromValidated(entry.createdAt, `files[${fileIndex}].history[${historyIndex}].createdAt`)
            }))
          }
        }
      });
      fileIds.set(file.id, createdFile.id);
    }

    for (const [relationshipIndex, relationship] of document.relationships.entries()) {
      const fromId = fileIds.get(relationship.fromId);
      const toId = fileIds.get(relationship.toId);
      const typeKey = effectiveRelationshipTypeKey(relationship);
      const typeId = typeKey ? relationshipTypeIds.get(typeKey) : undefined;
      if (!typeKey || !typeId) {
        throw new CampaignTransferError({
          valid: false,
          errors: [`relationships[${relationshipIndex}].typeKey "${relationship.typeKey ?? relationship.kind}" é inválido: tipo não encontrado.`],
          warnings: [],
          summary: validation.summary
        });
      }
      if (fromId && toId) {
        await tx.relationship.create({
          data: {
            ...(availableId(relationship.id, occupiedRelationships) ? { id: relationship.id } : {}),
            campaignId: campaign.id,
            fromId,
            toId,
            typeId,
            kind: RELATIONSHIP_KINDS.includes(typeKey as RelationshipKind) ? typeKey as RelationshipKind : 'GENERIC',
            label: relationship.label,
            description: relationship.description ?? null,
            importance: relationship.importance ?? 'NORMAL',
            visibility: relationship.visibility ?? 'GM',
            createdAt: dateFromValidated(relationship.createdAt, `relationships[${relationshipIndex}].createdAt`),
            ...(relationship.updatedAt ? { updatedAt: dateFromValidated(relationship.updatedAt, `relationships[${relationshipIndex}].updatedAt`) } : {})
          }
        });
      }
    }

    for (const folder of document.favoriteFolders) {
      const createdFolder = await tx.favoriteFolder.create({
        data: {
          campaignId: campaign.id,
          name: folder.name,
          icon: folder.icon,
          color: folder.color,
          order: folder.order,
          isCollapsed: folder.isCollapsed
        }
      });
      for (const entry of folder.entries) {
        const fileId = fileIds.get(entry.fileId);
        if (fileId) await tx.favoriteEntry.create({ data: { folderId: createdFolder.id, fileId, order: entry.order } });
      }
    }

    const sessionIds = new Map<string, string>();
    for (const [sessionIndex, session] of document.sessions.entries()) {
      const status = session.status ?? 'PLANNED';
      const createdSession = await tx.session.create({
        data: {
          ...(availableId(session.id, occupiedSessions) ? { id: session.id } : {}),
          campaignId: campaign.id,
          name: session.name,
          date: session.date ? dateFromValidated(session.date, `sessions[${sessionIndex}].date`) : null,
          summary: session.summary,
          checklist: session.checklist as Prisma.InputJsonValue,
          objectives: (session.objectives ?? []) as Prisma.InputJsonValue,
          agenda: (session.agenda ?? []) as Prisma.InputJsonValue,
          postSummary: session.postSummary ?? null,
          status,
          completedAt: status === 'COMPLETED' ? (session.completedAt ? dateFromValidated(session.completedAt, `sessions[${sessionIndex}].completedAt`) : new Date()) : null,
          order: session.order
        }
      });
      if (session.id) sessionIds.set(session.id, createdSession.id);
      for (const sourceFileId of session.fileIds) {
        const fileId = fileIds.get(sourceFileId);
        if (fileId) await tx.sessionFile.create({ data: { sessionId: createdSession.id, fileId } });
      }
    }

    if (document.briefing && isRecord(document.briefing)) {
      await tx.campaignBriefing.create({
        data: {
          campaignId: campaign.id,
          title: document.briefing.title,
          body: document.briefing.body,
          isPublished: false
        }
      });
    }

    for (const [eventIndex, event] of document.timelineEvents.entries()) {
      await tx.timelineEvent.create({
        data: {
          campaignId: campaign.id,
          title: event.title,
          happenedAt: dateFromValidated(event.happenedAt, `timelineEvents[${eventIndex}].happenedAt`),
          order: event.order,
          fileId: event.fileId ? fileIds.get(event.fileId) ?? null : null,
          isPublished: false
        }
      });
    }

    const nodeIds = new Map<string, string>();
    for (const node of document.board.nodes) {
      const fileId = fileIds.get(node.fileId);
      if (!fileId) continue;
      const createdNode = await tx.boardNode.create({ data: { campaignId: campaign.id, fileId, x: node.x, y: node.y } });
      nodeIds.set(node.fileId, createdNode.id);
    }
    for (const edge of document.board.edges) {
      const fromNodeId = nodeIds.get(edge.fromFileId);
      const toNodeId = nodeIds.get(edge.toFileId);
      if (fromNodeId && toNodeId) {
        await tx.boardEdge.create({
          data: {
            campaignId: campaign.id,
            fromNodeId,
            toNodeId,
            label: edge.label,
            color: edge.color,
            description: edge.description,
            curve: edge.curve ?? 0
          }
        });
      }
    }

    const pinIds = new Map<number, string>();
    for (const [pinIndex, pin] of sourceBoardPins.entries()) {
      const createdPin = await tx.investigationBoardPin.create({ data: { campaignId: campaign.id, text: pin.text, x: pin.x, y: pin.y, color: pin.color } });
      pinIds.set(pinIndex, createdPin.id);
    }
    const groupIds = new Map<number, string>();
    for (const [groupIndex, group] of sourceBoardGroups.entries()) {
      const createdGroup = await tx.investigationBoardGroup.create({ data: { campaignId: campaign.id, name: group.name, color: group.color, x: group.x, y: group.y, width: group.width, height: group.height } });
      groupIds.set(groupIndex, createdGroup.id);
      const groupNodeIds = group.fileIds.map((fileId) => nodeIds.get(fileId)).filter((nodeId): nodeId is string => Boolean(nodeId));
      if (groupNodeIds.length > 0) await tx.investigationBoardGroupItem.createMany({ data: groupNodeIds.map((boardNodeId) => ({ campaignId: campaign.id, groupId: createdGroup.id, boardNodeId })) });
    }
    const viewIds = new Map<string, string>();
    for (const view of sourceBoardViews) {
      const { pinIndexes, groupIndexes, ...navigation } = view.snapshot;
      const remappedSnapshot = { ...navigation, pinIds: pinIndexes.map((index) => pinIds.get(index)).filter((id): id is string => Boolean(id)), groupIds: groupIndexes.map((index) => groupIds.get(index)).filter((id): id is string => Boolean(id)) };
      const createdView = await tx.investigationBoardView.create({ data: { ...(availableId(view.id, occupiedBoardViews) ? { id: view.id } : {}), campaignId: campaign.id, name: view.name, kind: view.kind, description: view.description, order: view.order, snapshot: remappedSnapshot as unknown as Prisma.InputJsonValue } });
      if (view.id) viewIds.set(view.id, createdView.id);
    }

    const hypothesisIds = new Map<string, string>();
    for (const [hypothesisIndex, hypothesis] of sourceHypotheses.entries()) {
      const createdHypothesis = await tx.investigationHypothesis.create({
        data: {
          ...(availableId(hypothesis.id, occupiedHypotheses) ? { id: hypothesis.id } : {}),
          campaignId: campaign.id,
          title: hypothesis.title,
          summary: hypothesis.summary,
          status: hypothesis.status,
          createdAt: dateFromValidated(hypothesis.createdAt, `investigation.hypotheses[${hypothesisIndex}].createdAt`),
          updatedAt: dateFromValidated(hypothesis.updatedAt, `investigation.hypotheses[${hypothesisIndex}].updatedAt`),
          evidence: {
            create: hypothesis.evidence.map((evidence, evidenceIndex) => {
              const fileId = fileIds.get(evidence.fileId);
              if (!fileId) throw new CampaignTransferError({ valid: false, errors: [`investigation.hypotheses[${hypothesisIndex}].evidence[${evidenceIndex}].fileId não pôde ser remapeado.`], issues: [], warnings: [], summary: validation.summary });
              return {
                ...(availableId(evidence.id, occupiedHypothesisEvidence) ? { id: evidence.id } : {}),
                fileId,
                stance: evidence.stance,
                note: evidence.note,
                order: evidence.order,
                createdAt: dateFromValidated(evidence.createdAt, `investigation.hypotheses[${hypothesisIndex}].evidence[${evidenceIndex}].createdAt`),
                ...(evidence.updatedAt ? { updatedAt: dateFromValidated(evidence.updatedAt, `investigation.hypotheses[${hypothesisIndex}].evidence[${evidenceIndex}].updatedAt`) } : {})
              };
            })
          }
        }
      });
      if (hypothesis.id) hypothesisIds.set(hypothesis.id, createdHypothesis.id);
    }

    for (const session of sourceSessions) {
      const sessionId = session.id ? sessionIds.get(session.id) : undefined;
      if (!sessionId) continue;
      const mappedHypothesisIds = (session.hypothesisIds ?? []).map((id) => hypothesisIds.get(id)).filter((id): id is string => Boolean(id));
      const mappedViewIds = (session.viewIds ?? []).map((id) => viewIds.get(id)).filter((id): id is string => Boolean(id));
      if (mappedHypothesisIds.length > 0) await tx.sessionHypothesis.createMany({ data: mappedHypothesisIds.map((hypothesisId) => ({ sessionId, hypothesisId })) });
      if (mappedViewIds.length > 0) await tx.sessionBoardView.createMany({ data: mappedViewIds.map((viewId) => ({ sessionId, viewId })) });
    }

    for (const visibility of document.playerMode.visibility) {
      const fileId = fileIds.get(visibility.fileId);
      if (fileId) await tx.playerVisibility.create({ data: { fileId, isVisible: visibility.isVisible } });
    }
    await tx.playerModeConfig.create({ data: { campaignId: campaign.id, isEnabled: false, shareSlug: null } });

    return campaign;
  });

  return { campaign: created, validation };
}
