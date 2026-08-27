export type SystemType = 'ORDEM_PARANORMAL' | 'DND_5E' | 'CUSTOM';

export type FileType =
  | 'CAMPAIGN'
  | 'NPC'
  | 'CHARACTER'
  | 'THREAT'
  | 'PUZZLE'
  | 'DOCUMENT'
  | 'CLUE'
  | 'OBJECT'
  | 'EVENT'
  | 'SESSION'
  | 'MAP'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'NOTE'
  | 'LOCATION';

export type RelationshipKind = 'GENERIC' | 'LEADS_TO' | 'BELONGS_TO' | 'CONTAINS' | 'BLOCKS' | 'UNLOCKS';
export type RelationshipImportance = 'CRITICAL' | 'IMPORTANT' | 'NORMAL' | 'OPTIONAL';
export type InvestigationBoardViewKind = 'SESSION' | 'CASE' | 'ARC';
export type PlayerAudience = 'P1' | 'P2' | 'P3' | 'P4';
export type RelationshipVisibility = 'GM' | 'ALL' | PlayerAudience;

export type HistoryAction =
  | 'created'
  | 'edited'
  | 'archived'
  | 'restored'
  | 'trashed'
  | 'favorited'
  | 'unfavorited'
  | 'duplicated'
  | 'moved'
  | 'combat_hp_changed'
  | 'relationship_added'
  | 'relationship_removed';

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  system: SystemType;
  coverImage: string | null;
  isArchived: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    files: number;
    sessions: number;
  };
}

export interface Tag {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
}

export interface Attachment {
  id: string;
  fileId: string;
  url: string;
  label: string | null;
  mimeType: string | null;
  createdAt: string;
}

export interface Comment {
  id: string;
  fileId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
}

export interface FileHistoryEntry {
  id: string;
  fileId: string;
  action: HistoryAction | string;
  summary: string | null;
  authorId: string | null;
  createdAt: string;
}

export interface Relationship {
  id: string;
  campaignId: string;
  fromId: string;
  toId: string;
  typeId: string;
  type?: RelationshipType;
  kind: RelationshipKind;
  label: string | null;
  description: string | null;
  importance: RelationshipImportance;
  visibility: RelationshipVisibility;
  createdAt: string;
  updatedAt: string;
  from?: CampaignFile;
  to?: CampaignFile;
}

export interface RelationshipType {
  id: string;
  campaignId: string | null;
  key: string;
  name: string;
  description: string | null;
  directional: boolean;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteFolder {
  id: string;
  campaignId: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  isCollapsed: boolean;
  entries?: FavoriteEntry[];
}

export interface FavoriteEntry {
  id: string;
  folderId: string;
  fileId: string;
  order: number;
  file?: CampaignFile;
}

export interface CampaignFile {
  id: string;
  campaignId: string;
  type: FileType;
  name: string;
  description: string | null;
  content: string | null;
  data: Record<string, unknown>;
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  restrictToGrants: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: { tag: Tag }[];
  attachments?: Attachment[];
  comments?: Comment[];
  history?: FileHistoryEntry[];
  relationshipsFrom?: Relationship[];
  relationshipsTo?: Relationship[];
}

export type CombatEncounterStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ENDED';
export type CombatParticipantKind = 'CHARACTER' | 'THREAT';

export interface CombatParticipant {
  id: string;
  encounterId: string;
  sourceFileId: string | null;
  name: string;
  kind: CombatParticipantKind;
  initiative: number;
  initiativeBonus: number;
  turnOrder: number;
  currentHp: number | null;
  maxHp: number | null;
  conditions: string[];
  isDefeated: boolean;
  isVisibleToPlayers: boolean;
  sourceFile?: Pick<CampaignFile, 'id' | 'name' | 'type'> | null;
}

export interface CombatEncounter {
  id: string;
  campaignId: string;
  sessionId: string | null;
  name: string;
  status: CombatEncounterStatus;
  round: number;
  turnIndex: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
  session?: { id: string; name: string } | null;
  participants: CombatParticipant[];
}

export interface PlayerCombatView {
  id: string;
  name: string;
  round: number;
  participants: Array<{
    id: string;
    name: string;
    kind: CombatParticipantKind;
    initiative: number;
    turnOrder: number;
    isCurrentTurn: boolean;
    ownHp: { currentHp: number | null; maxHp: number | null } | null;
    conditions: string[];
  }>;
}

export interface CampaignHealth {
  score: number; // 0-100
  errors: CompilerIssue[];
  warnings: CompilerIssue[];
  suggestions: CompilerIssue[];
  simulation?: GraphSimulation;
}

export interface CompilerIssue {
  id: string;
  code?: string;
  rule?: string;
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  explanation?: string;
  entityIds?: string[];
  fileId?: string;
  action?: { label: string; href: string };
}

export type ViewMode = 'list' | 'grid';
export type SortField = 'name' | 'updatedAt' | 'createdAt' | 'type';
export type SortDirection = 'asc' | 'desc';

export const SYSTEM_LABELS: Record<SystemType, string> = {
  ORDEM_PARANORMAL: 'Ordem Paranormal',
  DND_5E: 'D&D 5e',
  CUSTOM: 'Personalizado'
};

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  CAMPAIGN: 'Campanha',
  NPC: 'NPC',
  CHARACTER: 'Personagem',
  THREAT: 'Ameaça',
  PUZZLE: 'Puzzle',
  DOCUMENT: 'Documento',
  CLUE: 'Pista',
  OBJECT: 'Objeto',
  EVENT: 'Evento',
  SESSION: 'Sessão',
  MAP: 'Mapa',
  IMAGE: 'Imagem',
  AUDIO: 'Áudio',
  VIDEO: 'Vídeo',
  NOTE: 'Anotação',
  LOCATION: 'Local'
};

// lucide-react icon names — kept as strings here (types layer has no JSX)
// and resolved to components in src/components/fileTypeIcon.tsx
export const FILE_TYPE_ICON_NAMES: Record<FileType, string> = {
  CAMPAIGN: 'BookMarked',
  NPC: 'UserCog',
  CHARACTER: 'Users',
  THREAT: 'Skull',
  PUZZLE: 'Puzzle',
  DOCUMENT: 'FileText',
  CLUE: 'Search',
  OBJECT: 'Package',
  EVENT: 'CalendarDays',
  SESSION: 'BookOpen',
  MAP: 'Map',
  IMAGE: 'Image',
  AUDIO: 'Music',
  VIDEO: 'Video',
  NOTE: 'StickyNote',
  LOCATION: 'MapPin'
};

export const RELATIONSHIP_KIND_LABELS: Record<RelationshipKind, string> = {
  GENERIC: 'Relacionado a',
  LEADS_TO: 'Leva a',
  BELONGS_TO: 'Pertence a',
  CONTAINS: 'Contém',
  BLOCKS: 'Bloqueia',
  UNLOCKS: 'Desbloqueia'
};

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: 'Criado',
  edited: 'Editado',
  archived: 'Arquivado',
  restored: 'Restaurado',
  trashed: 'Movido para a lixeira',
  favorited: 'Favoritado',
  unfavorited: 'Removido dos favoritos',
  duplicated: 'Duplicado',
  moved: 'Movido',
  combat_hp_changed: 'HP alterado em combate',
  relationship_added: 'Relacionamento criado',
  relationship_removed: 'Relacionamento removido'
};

// ---------- V2: file explorer view-layer types ----------

export type ExplorerScope = 'active' | 'archived' | 'trash';

export interface CampaignFileSummary {
  id: string;
  type: FileType;
  name: string;
  isFavorite: boolean;
  isArchived: boolean;
}

// ---------- V3: custom system builder + character sheet types ----------

export interface CampaignAttributeDef {
  id: string;
  name: string;
  shortLabel: string | null;
  min: number;
  max: number;
  defaultVal: number;
  order: number;
}

export interface CampaignSkillDef {
  id: string;
  name: string;
  linkedAttr: string | null;
  order: number;
}

export interface CampaignClassDef {
  id: string;
  name: string;
  description: string | null;
}

export interface CampaignRaceDef {
  id: string;
  name: string;
  description: string | null;
}

export interface CampaignDetail extends Campaign {
  attributes: CampaignAttributeDef[];
  skills: CampaignSkillDef[];
  classes: CampaignClassDef[];
  races: CampaignRaceDef[];
}

export interface SheetInventoryItem {
  id: string;
  name: string;
  quantity?: number;
  uses?: number;
  description?: string;
}

export interface SheetAbilityItem {
  id: string;
  name: string;
  description?: string;
  uses?: number;
}

export interface SheetData {
  attributes?: Record<string, number>;
  skills?: Record<string, boolean>;
  classId?: string;
  raceId?: string;
  level?: number;
  background?: string;
  concept?: string;
  playerName?: string;
  pronouns?: string;
  vitals?: { current?: number; max?: number; secondaryCurrent?: number; secondaryMax?: number };
  combat?: { defense?: number; initiative?: number; movement?: number; proficiency?: number };
  inventory?: SheetInventoryItem[];
  abilities?: SheetAbilityItem[];
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export type SessionPlanningStatus = 'PLANNED' | 'COMPLETED';

export interface SessionPlanItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SessionPlanning {
  id: string;
  campaignId: string;
  name: string;
  date: string | null;
  summary: string | null;
  checklist: ChecklistItem[];
  objectives: SessionPlanItem[];
  agenda: SessionPlanItem[];
  postSummary: string | null;
  status: SessionPlanningStatus;
  completedAt: string | null;
  order: number;
  files: Array<Pick<CampaignFile, 'id' | 'name' | 'type' | 'isArchived' | 'isTrashed'>>;
  hypotheses: Array<Pick<InvestigationHypothesis, 'id' | 'title' | 'status'>>;
  views: Array<Pick<InvestigationBoardViewItem, 'id' | 'name' | 'kind'>>;
}

// ---------- V4: timeline, investigation board, player mode ----------

export interface TimelineEventItem {
  id: string;
  campaignId: string;
  title: string;
  happenedAt: string;
  order: number;
  createdAt?: string;
  isPublished: boolean;
  fileId: string | null;
  file?: CampaignFile | null;
}

export interface PublicBriefing {
  title: string;
  body: string;
}

export interface PublicTimelineEvent {
  title: string;
  happenedAt: string;
  file: { name: string; type: FileType } | null;
}

export interface BoardNodeItem {
  id: string;
  campaignId: string;
  fileId: string;
  x: number;
  y: number;
  file: CampaignFile;
}

export interface BoardEdgeItem {
  id: string;
  campaignId: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
  color: string;
  description: string | null;
  curve: number;
}

export interface InvestigationBoardPinItem {
  id: string;
  campaignId: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationBoardGroupItem {
  groupId: string;
  boardNodeId: string;
  fileId: string;
}

export interface InvestigationBoardGroup {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  items: InvestigationBoardGroupItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerModeConfigData {
  id: string;
  campaignId: string;
  isEnabled: boolean;
  shareSlug: string | null;
}

export interface PlayerVisibilityRow {
  id: string;
  name: string;
  type: FileType;
  isVisible: boolean;
  restrictToGrants: boolean;
  state: 'PUBLIC' | 'GRANT' | 'PRIVATE' | 'ARCHIVED' | 'UNAVAILABLE';
}

export interface PlayerAccessPreviewFile {
  id: string;
  name: string;
  type: FileType;
  tags: { id: string; name: string; color: string }[];
  access: 'PUBLISHED' | 'GRANT';
}

export interface PlayerAccessPreviewData {
  member: { id: string; userId: string; name: string; email: string };
  modeEnabled: boolean;
  files: PlayerAccessPreviewFile[];
  publishedCount: number;
  grantCount: number;
}

export interface PublicCampaignSummary {
  name: string;
  description: string | null;
  system: SystemType;
  coverImage: string | null;
}

export interface PublicCampaignData {
  campaign: PublicCampaignSummary;
  files: CampaignFile[];
  relationships: PlayerRelationship[];
  briefing: PublicBriefing | null;
  timeline: PublicTimelineEvent[];
}

export interface PlayerRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  type: { key: string; name: string };
  label: string | null;
  description: string | null;
  importance: RelationshipImportance;
}


// ---------- V5: campaign transfer format ----------

export interface CampaignExportFile {
  id: string;
  type: FileType;
  name: string;
  description: string | null;
  content: string | null;
  authorId: string | null;
  data: Record<string, unknown>;
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  attachments: CampaignExportAttachment[];
  comments: CampaignExportComment[];
  history: CampaignExportHistory[];
}

export interface CampaignExportAttachment {
  url: string;
  label: string | null;
  mimeType: string | null;
  createdAt: string;
}

export interface CampaignExportComment {
  authorId: string | null;
  body: string;
  createdAt: string;
}

export interface CampaignExportHistory {
  action: string;
  summary: string | null;
  authorId: string | null;
  createdAt: string;
}

export interface CampaignExportTag {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
}

export interface CampaignExportRelationship {
  id?: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  typeKey?: string;
  label: string | null;
  description?: string | null;
  importance?: RelationshipImportance;
  visibility?: RelationshipVisibility;
  createdAt: string;
  updatedAt?: string;
}

export interface CampaignExportRelationshipType {
  id?: string;
  scope?: 'GLOBAL' | 'CAMPAIGN';
  key: string;
  name: string;
  description: string | null;
  directional: boolean;
  color: string | null;
  icon: string | null;
}

export interface CampaignExportFavoriteFolder {
  name: string;
  icon: string | null;
  color: string | null;
  order: number;
  isCollapsed: boolean;
  entries: { fileId: string; order: number }[];
}

export interface CampaignExportSession {
  id?: string;
  name: string;
  date: string | null;
  summary: string | null;
  checklist: unknown;
  objectives?: unknown;
  agenda?: unknown;
  postSummary?: string | null;
  status?: SessionPlanningStatus;
  completedAt?: string | null;
  order: number;
  fileIds: string[];
  hypothesisIds?: string[];
  viewIds?: string[];
}

export interface CampaignExportBriefing {
  title: string;
  body: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampaignExportTimelineEvent {
  title: string;
  happenedAt: string;
  order: number;
  fileId: string | null;
  isPublished?: boolean;
}

export interface CampaignExportBoardNode {
  fileId: string;
  x: number;
  y: number;
}

export interface CampaignExportBoardEdge {
  fromFileId: string;
  toFileId: string;
  label: string | null;
  color: string;
  description: string | null;
  /** Curvatura da conexão visual; opcional apenas para importar snapshots V1 antigos. */
  curve?: number;
}

export interface CampaignExportBoardPin {
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface CampaignExportBoardGroup {
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fileIds: string[];
}

export interface CampaignExportBoardView {
  id?: string;
  name: string;
  kind: InvestigationBoardViewKind;
  description: string | null;
  order: number;
  snapshot: Omit<InvestigationBoardViewSnapshot, 'pinIds' | 'groupIds'> & { pinIndexes: number[]; groupIndexes: number[] };
}

export type HypothesisStatus = 'OPEN' | 'SUPPORTED' | 'REFUTED' | 'RESOLVED';
export type EvidenceStance = 'SUPPORTS' | 'CONTRADICTS' | 'CONTEXT';

export interface HypothesisEvidence {
  id: string;
  hypothesisId: string;
  fileId: string;
  stance: EvidenceStance;
  note: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  file: Pick<CampaignFile, 'id' | 'name' | 'type' | 'isTrashed' | 'isArchived'>;
}

export interface InvestigationHypothesis {
  id: string;
  campaignId: string;
  title: string;
  summary: string | null;
  status: HypothesisStatus;
  createdAt: string;
  updatedAt: string;
  evidence: HypothesisEvidence[];
}

export interface InvestigationBoardViewFilters {
  search: string;
  fileType: FileType | 'ALL';
  tagIds: string[];
  scope: 'active' | 'archived' | 'trash';
  favoritesOnly: boolean;
  relationshipImportance: RelationshipImportance | 'ALL';
  relationshipVisibility: RelationshipVisibility | 'ALL';
  hypothesisStatus: HypothesisStatus | 'ALL';
  evidenceStance: EvidenceStance | 'ALL';
  layers: {
    files: boolean;
    officialRelationships: boolean;
    visualEdges: boolean;
    evidence: boolean;
    hypotheses: boolean;
    annotations: boolean;
  };
}

export interface InvestigationBoardViewSnapshot {
  pan: { x: number; y: number };
  zoom: number;
  filters: InvestigationBoardViewFilters;
  pinIds: string[];
  groupIds: string[];
}

export interface InvestigationBoardViewItem {
  id: string;
  campaignId: string;
  name: string;
  kind: InvestigationBoardViewKind;
  description: string | null;
  order: number;
  snapshot: InvestigationBoardViewSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignExportHypothesisEvidence {
  id?: string;
  fileId: string;
  stance: EvidenceStance;
  note: string | null;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CampaignExportHypothesis {
  id?: string;
  title: string;
  summary: string | null;
  status: HypothesisStatus;
  createdAt: string;
  updatedAt: string;
  evidence: CampaignExportHypothesisEvidence[];
}

export interface CampaignExportInvestigation {
  hypotheses: CampaignExportHypothesis[];
}

export interface CampaignExportPlayerMode {
  isEnabled: boolean;
  visibility: { fileId: string; isVisible: boolean }[];
}

export interface CampaignExportDocument {
  format: 'rpg-campaign-studio';
  version: 1;
  exportedAt: string;
  campaign: {
    id: string;
    name: string;
    description: string | null;
    system: SystemType;
    coverImage: string | null;
  };
  customSystem: {
    attributes: CampaignAttributeDef[];
    skills: CampaignSkillDef[];
    classes: CampaignClassDef[];
    races: CampaignRaceDef[];
  };
  files: CampaignExportFile[];
  tags: CampaignExportTag[];
  relationships: CampaignExportRelationship[];
  relationshipTypes?: CampaignExportRelationshipType[];
  favoriteFolders: CampaignExportFavoriteFolder[];
  sessions: CampaignExportSession[];
  briefing?: CampaignExportBriefing | null;
  timelineEvents: CampaignExportTimelineEvent[];
  board: {
    nodes: CampaignExportBoardNode[];
    edges: CampaignExportBoardEdge[];
    pins?: CampaignExportBoardPin[];
    groups?: CampaignExportBoardGroup[];
    views?: CampaignExportBoardView[];
  };
  playerMode: CampaignExportPlayerMode;
  investigation?: CampaignExportInvestigation;
}

export interface CampaignTransferSummary {
  files: number;
  tags: number;
  relationships: number;
  sessions: number;
  timelineEvents: number;
  boardNodes: number;
  boardEdges: number;
  boardPins: number;
  boardGroups: number;
  boardViews: number;
}

export interface CampaignTransferValidationIssue {
  path: string;
  value: unknown;
  rule: string;
  message: string;
}

export interface CampaignTransferValidation {
  valid: boolean;
  errors: string[];
  issues?: CampaignTransferValidationIssue[];
  warnings: string[];
  summary: CampaignTransferSummary;
}

export type CampaignImportIdentityMode = 'REMAP' | 'PRESERVE_WHEN_AVAILABLE';

export interface CampaignImportDryRun {
  canImport: boolean;
  identityMode: CampaignImportIdentityMode;
  validation: CampaignTransferValidation;
  identityPlan: {
    strategy: 'REMAP_ALL' | 'PRESERVE_WHEN_AVAILABLE';
    campaignId: 'REMAP' | 'PRESERVE_WHEN_AVAILABLE';
    files: number;
    tags: number;
    relationshipTypes: number;
    relationships: number;
    hypotheses: number;
    hypothesisEvidence: number;
    boardPins: number;
    boardGroups: number;
    boardViews: number;
    sessions?: number;
    sessionHypothesisLinks?: number;
    sessionBoardViewLinks?: number;
    customSystemEntities: number;
  };
}


// ---------- V6: compiler graph simulation ----------

export interface GraphPath {
  fileIds: string[];
  fileNames: string[];
}

export interface GraphSimulationIssue {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  fileIds: string[];
}

export interface GraphSimulationBranch {
  valid: boolean;
  starts: string[];
  finals: string[];
  reachableFinals: string[];
  deadEnds: string[];
  blockedNodes: string[];
  paths: GraphPath[];
  issues: GraphSimulationIssue[];
}

export interface GraphSimulation {
  valid: boolean;
  official: GraphSimulationBranch;
  board: GraphSimulationBranch;
  boardEdgesCount: number;
  generatedAt: string;
}
