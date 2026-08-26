import type {
  CampaignFile,
  Attachment,
  ExplorerScope,
  FileType,
  SortField,
  Tag,
  FavoriteFolder,
  Relationship,
  RelationshipImportance,
  RelationshipKind,
  RelationshipType,
  RelationshipVisibility,
  CampaignDetail,
  CampaignAttributeDef,
  CampaignSkillDef,
  CampaignClassDef,
  CampaignRaceDef,
  TimelineEventItem,
  BoardNodeItem,
  BoardEdgeItem,
  InvestigationBoardPinItem,
  InvestigationBoardGroup,
  InvestigationBoardViewItem,
  InvestigationBoardViewKind,
  InvestigationBoardViewSnapshot,
  PlayerModeConfigData,
  PlayerAccessPreviewData,
  PlayerVisibilityRow,
  PublicCampaignData,
  Campaign,
  CampaignHealth,
  SessionPlanning,
  CampaignExportDocument,
  CampaignImportDryRun,
  CampaignImportIdentityMode,
  CampaignTransferValidation,
  HypothesisStatus,
  EvidenceStance,
  InvestigationHypothesis,
  HypothesisEvidence,
  CombatEncounter,
  CombatParticipant,
  PlayerCombatView
} from '@/types';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface ReceivedInvite {
  id: string;
  inviteeEmail: string;
  expiresAt: string;
  createdAt: string;
  campaign: { id: string; name: string; description: string | null; coverImage: string | null };
  inviter: { name: string; email: string };
}

export interface InvitePreview {
  id: string;
  inviteeEmail: string;
  expiresAt: string;
  campaign: { id: string; name: string; description: string | null; coverImage: string | null; ownerId: string };
  inviter: { id: string; name: string; email: string };
}

export interface CampaignInviteItem {
  id: string;
  inviteeEmail: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CampaignMemberItem {
  id: string;
  userId: string;
  role: 'PLAYER';
  audience: 'P1' | 'P2' | 'P3' | 'P4' | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isMultipart = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(url, {
    ...init,
    headers: isMultipart ? init?.headers : { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? 'Erro na requisição');
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const authApi = {
  register(input: { name: string; email: string; password: string }) {
    return request<{ user: PublicUser }>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) });
  },
  login(input: { email: string; password: string }) {
    return request<{ user: PublicUser }>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) });
  },
  logout() {
    return request<{ success: true }>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request<{ user: PublicUser | null }>('/api/auth/me');
  }
};

export const invitesApi = {
  async listReceived() {
    const response = await request<{ invites: ReceivedInvite[] }>('/api/invites');
    return response.invites ?? [];
  },
  preview(token: string) {
    return request<InvitePreview>(`/api/invites/${encodeURIComponent(token)}`);
  },
  accept(token: string) {
    return request<{ member: { id: string; role: 'PLAYER' }; campaign: InvitePreview['campaign'] }>(`/api/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
  },
  async listForCampaign(campaignId: string) {
    const response = await request<{ invites: CampaignInviteItem[] }>(`/api/campaigns/${campaignId}/invites`);
    return response.invites ?? [];
  },
  create(campaignId: string, input: { inviteeEmail: string; expiresInDays?: number }) {
    return request<{ invite: CampaignInviteItem & { campaign: { id: string; name: string } }; token: string }>(`/api/campaigns/${campaignId}/invites`, { method: 'POST', body: JSON.stringify(input) });
  },
  revoke(campaignId: string, inviteId: string) {
    return request<CampaignInviteItem>(`/api/campaigns/${campaignId}/invites/${inviteId}`, { method: 'DELETE' });
  }
};

export interface ListFilesQuery {
  scope?: ExplorerScope;
  type?: FileType;
  tagIds?: string[];
  favoritesOnly?: boolean;
  search?: string;
  sort?: SortField;
  direction?: 'asc' | 'desc';
}

export const playerCharacterApi = {
  get(campaignId: string) {
    return request<{ character: CampaignFile | null }>(`/api/campaigns/${campaignId}/player-character`);
  },
  create(campaignId: string, name: string) {
    return request<{ character: CampaignFile }>(`/api/campaigns/${campaignId}/player-character`, { method: 'POST', body: JSON.stringify({ name }) });
  },
  update(fileId: string, data: Record<string, unknown>) {
    return request<CampaignFile>(`/api/player-character/${fileId}`, { method: 'PATCH', body: JSON.stringify({ data }) });
  }
};

export const combatApi = {
  list(campaignId: string) {
    return request<CombatEncounter[]>(`/api/campaigns/${campaignId}/combat`);
  },
  get(campaignId: string, encounterId: string) {
    return request<CombatEncounter>(`/api/campaigns/${campaignId}/combat/${encounterId}`);
  },
  create(campaignId: string, input: { name: string; sessionId?: string; participants: Array<{ sourceFileId?: string; name: string; kind: 'CHARACTER' | 'THREAT'; initiative: number; initiativeBonus?: number; currentHp?: number | null; maxHp?: number | null; conditions?: string[]; isVisibleToPlayers?: boolean }> }) {
    return request<CombatEncounter>(`/api/campaigns/${campaignId}/combat`, { method: 'POST', body: JSON.stringify(input) });
  },
  action(campaignId: string, encounterId: string, action: 'START' | 'ADVANCE' | 'END') {
    return request<CombatEncounter>(`/api/campaigns/${campaignId}/combat/${encounterId}/action`, { method: 'POST', body: JSON.stringify({ action }) });
  },
  updateParticipant(campaignId: string, encounterId: string, participantId: string, input: { hitPointDelta?: number; conditions?: string[]; isVisibleToPlayers?: boolean }) {
    return request<CombatParticipant>(`/api/campaigns/${campaignId}/combat/${encounterId}/participants/${participantId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  playerView(campaignId: string) {
    return request<{ encounter: PlayerCombatView | null }>(`/api/campaigns/${campaignId}/combat/player`);
  }
};

export const membersApi = {
  async list(campaignId: string) {
    const response = await request<{ members: CampaignMemberItem[] }>(`/api/campaigns/${campaignId}/members`);
    return response.members ?? [];
  },
  remove(campaignId: string, userId: string) {
    return request<{ success: true }>(`/api/campaigns/${campaignId}/members/${userId}`, { method: 'DELETE' });
  },
  setAudience(campaignId: string, userId: string, audience: 'P1' | 'P2' | 'P3' | 'P4' | null) {
    return request<Pick<CampaignMemberItem, 'id' | 'userId' | 'audience'>>(`/api/campaigns/${campaignId}/members`, { method: 'PATCH', body: JSON.stringify({ userId, audience }) });
  }
};

export const filesApi = {
  list(campaignId: string, query: ListFilesQuery = {}) {
    const params = new URLSearchParams();
    if (query.scope) params.set('scope', query.scope);
    if (query.type) params.set('type', query.type);
    if (query.tagIds?.length) params.set('tags', query.tagIds.join(','));
    if (query.favoritesOnly) params.set('favorites', 'true');
    if (query.search) params.set('search', query.search);
    if (query.sort) params.set('sort', query.sort);
    if (query.direction) params.set('dir', query.direction);
    return request<CampaignFile[]>(`/api/campaigns/${campaignId}/files?${params.toString()}`);
  },

  counts(campaignId: string) {
    return request<Record<string, number>>(`/api/campaigns/${campaignId}/files/counts`);
  },

  get(fileId: string) {
    return request<CampaignFile>(`/api/files/${fileId}`);
  },

  create(campaignId: string, input: { type: FileType; name: string; description?: string }) {
    return request<CampaignFile>(`/api/campaigns/${campaignId}/files`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  update(fileId: string, input: Partial<Pick<CampaignFile, 'name' | 'description' | 'content' | 'data'>>) {
    return request<CampaignFile>(`/api/files/${fileId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },

  duplicate(fileId: string) {
    return request<CampaignFile>(`/api/files/${fileId}/duplicate`, { method: 'POST' });
  },

  archive(fileId: string) {
    return request(`/api/files/${fileId}/archive`, { method: 'POST' });
  },

  restore(fileId: string) {
    return request(`/api/files/${fileId}/restore`, { method: 'POST' });
  },

  trash(fileId: string) {
    return request(`/api/files/${fileId}/trash`, { method: 'POST' });
  },

  restoreFromTrash(fileId: string) {
    return request(`/api/files/${fileId}/restore-trash`, { method: 'POST' });
  },

  permanentDelete(fileId: string) {
    return request(`/api/files/${fileId}`, { method: 'DELETE' });
  },

  setFavorite(fileId: string, isFavorite: boolean, folderId?: string) {
    return request(`/api/files/${fileId}/favorite`, {
      method: 'POST',
      body: JSON.stringify({ isFavorite, folderId })
    });
  },

  bulk(ids: string[], action: 'archive' | 'restore' | 'trash' | 'restoreFromTrash' | 'permanentDelete') {
    return request(`/api/files/bulk`, { method: 'POST', body: JSON.stringify({ ids, action }) });
  },

  setTags(fileId: string, tagIds: string[]) {
    return request(`/api/files/${fileId}/tags`, { method: 'PUT', body: JSON.stringify({ tagIds }) });
  },

  addComment(fileId: string, body: string) {
    return request(`/api/files/${fileId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  },

  addAttachment(fileId: string, input: { url: string; label?: string; mimeType?: string }) {
    return request<Attachment>(`/api/files/${fileId}/attachments`, { method: 'POST', body: JSON.stringify(input) });
  },

  uploadAttachment(fileId: string, file: File, label?: string) {
    const form = new FormData();
    form.append('file', file);
    if (label?.trim()) form.append('label', label.trim());
    return request<Attachment>(`/api/files/${fileId}/attachments/upload`, { method: 'POST', body: form });
  },

  removeAttachment(fileId: string, attachmentId: string) {
    return request(`/api/files/${fileId}/attachments/${attachmentId}`, { method: 'DELETE' });
  }
};

export interface FileAccessMember {
  id: string;
  name: string;
  email: string;
  role: 'PLAYER';
  canView: boolean;
}

export interface FileAccessData {
  file: { id: string; campaignId: string; restrictToGrants: boolean } | null;
  members: FileAccessMember[];
}

export const fileAccessApi = {
  get(fileId: string) {
    return request<FileAccessData>(`/api/files/${fileId}/access`);
  },
  update(fileId: string, input: { restrictToGrants: boolean; grants: Array<{ userId: string; canView: boolean }> }) {
    return request<FileAccessData>(`/api/files/${fileId}/access`, { method: 'PUT', body: JSON.stringify(input) });
  }
};

export interface AuditEventItem {
  id: string;
  campaignId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

export const auditApi = {
  list(campaignId: string, take = 80) {
    return request<AuditEventItem[]>(`/api/campaigns/${campaignId}/audit?take=${take}`);
  }
};

export interface GlobalSearchResult {
  kind: 'campaign' | 'file';
  id: string;
  name: string;
  type?: FileType;
  campaignId: string;
  campaignName: string;
}

export const searchApi = {
  search(query: string) {
    return request<{ query: string; results: GlobalSearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  }
};

export const campaignsApi = {
  list(includeArchived = false) {
    const suffix = includeArchived ? '?archived=true' : '';
    return request<Campaign[]>(`/api/campaigns${suffix}`);
  },
  get(id: string) {
    return request<CampaignDetail>(`/api/campaigns/${id}`);
  },
  create(input: { name: string; description?: string; system: Campaign['system'] }) {
    return request<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(input) });
  }
};

export const campaignHealthApi = {
  get(campaignId: string) {
    return request<CampaignHealth>(`/api/campaigns/${campaignId}/health`);
  },
  simulate(campaignId: string) {
    return request<CampaignHealth>(`/api/campaigns/${campaignId}/health/simulate`, { method: 'POST' });
  }
};

export const customSystemApi = {
  listAttributes(campaignId: string) {
    return request<CampaignAttributeDef[]>(`/api/campaigns/${campaignId}/attributes`);
  },
  createAttribute(campaignId: string, input: { name: string; shortLabel?: string; min?: number; max?: number; defaultVal?: number }) {
    return request<CampaignAttributeDef>(`/api/campaigns/${campaignId}/attributes`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  removeAttribute(campaignId: string, attrId: string) {
    return request(`/api/campaigns/${campaignId}/attributes/${attrId}`, { method: 'DELETE' });
  },

  listSkills(campaignId: string) {
    return request<CampaignSkillDef[]>(`/api/campaigns/${campaignId}/skills`);
  },
  createSkill(campaignId: string, input: { name: string; linkedAttr?: string }) {
    return request<CampaignSkillDef>(`/api/campaigns/${campaignId}/skills`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  removeSkill(campaignId: string, skillId: string) {
    return request(`/api/campaigns/${campaignId}/skills/${skillId}`, { method: 'DELETE' });
  },

  listClasses(campaignId: string) {
    return request<CampaignClassDef[]>(`/api/campaigns/${campaignId}/classes`);
  },
  createClass(campaignId: string, input: { name: string; description?: string }) {
    return request<CampaignClassDef>(`/api/campaigns/${campaignId}/classes`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  removeClass(campaignId: string, classId: string) {
    return request(`/api/campaigns/${campaignId}/classes/${classId}`, { method: 'DELETE' });
  },

  listRaces(campaignId: string) {
    return request<CampaignRaceDef[]>(`/api/campaigns/${campaignId}/races`);
  },
  createRace(campaignId: string, input: { name: string; description?: string }) {
    return request<CampaignRaceDef>(`/api/campaigns/${campaignId}/races`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  removeRace(campaignId: string, raceId: string) {
    return request(`/api/campaigns/${campaignId}/races/${raceId}`, { method: 'DELETE' });
  }
};

export const tagsApi = {
  list(campaignId: string) {
    return request<Tag[]>(`/api/tags?campaignId=${campaignId}`);
  },
  create(input: { campaignId: string; name: string; color?: string; icon?: string; description?: string }) {
    return request<Tag>(`/api/tags`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: Partial<Pick<Tag, 'name' | 'color' | 'icon' | 'description'>>) {
    return request<Tag>(`/api/tags/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return request(`/api/tags/${id}`, { method: 'DELETE' });
  }
};

export const favoriteFoldersApi = {
  list(campaignId: string) {
    return request<FavoriteFolder[]>(`/api/favorite-folders?campaignId=${campaignId}`);
  },
  create(input: { campaignId: string; name: string; icon?: string; color?: string }) {
    return request<FavoriteFolder>(`/api/favorite-folders`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: Partial<Pick<FavoriteFolder, 'name' | 'icon' | 'color' | 'isCollapsed'>>) {
    return request<FavoriteFolder>(`/api/favorite-folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },
  remove(id: string) {
    return request(`/api/favorite-folders/${id}`, { method: 'DELETE' });
  },
  addEntry(folderId: string, fileId: string, fromFolderId?: string) {
    return request(`/api/favorite-folders/${folderId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ fileId, fromFolderId })
    });
  },
  removeEntry(folderId: string, fileId: string) {
    return request(`/api/favorite-folders/${folderId}/entries/${fileId}`, { method: 'DELETE' });
  },
  reorder(folderIds: string[]) {
    return request(`/api/favorite-folders/reorder`, { method: 'POST', body: JSON.stringify({ folderIds }) });
  }
};

export const relationshipsApi = {
  listForEntity(fileId: string) {
    return request<{ outgoing: Relationship[]; incoming: Relationship[] }>(`/api/relationships?fileId=${encodeURIComponent(fileId)}`);
  },
  graph(campaignId: string) {
    return request<{ nodes: Array<{ id: string; name: string; type: FileType }>; edges: Array<{ id: string; sourceId: string; targetId: string; type: RelationshipType; label: string | null; description: string | null; importance: RelationshipImportance; visibility: RelationshipVisibility }> }>(`/api/campaigns/${campaignId}/relationships/graph`);
  },
  create(input: { fromId: string; toId: string; typeId?: string; typeKey?: string; kind?: RelationshipKind; label?: string; description?: string; importance?: RelationshipImportance; visibility?: RelationshipVisibility }) {
    return request<Relationship>(`/api/relationships`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: { typeId?: string; typeKey?: string; kind?: RelationshipKind; label?: string; description?: string; importance?: RelationshipImportance; visibility?: RelationshipVisibility }) {
    return request<Relationship>(`/api/relationships/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return request(`/api/relationships/${id}`, { method: 'DELETE' });
  }
};

export const relationshipTypesApi = {
  list(campaignId: string) {
    return request<RelationshipType[]>(`/api/campaigns/${campaignId}/relationship-types`);
  },
  create(campaignId: string, input: { key: string; name: string; description?: string; directional?: boolean; color?: string; icon?: string }) {
    return request<RelationshipType>(`/api/campaigns/${campaignId}/relationship-types`, { method: 'POST', body: JSON.stringify(input) });
  }
};

export const timelineApi = {
  list(campaignId: string) {
    return request<TimelineEventItem[]>(`/api/campaigns/${campaignId}/timeline`);
  },
  create(campaignId: string, input: { title: string; happenedAt: string; fileId?: string }) {
    return request<TimelineEventItem>(`/api/campaigns/${campaignId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },
  update(id: string, input: Partial<{ title: string; happenedAt: string; fileId: string | null }>) {
    return request<TimelineEventItem>(`/api/timeline/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return request(`/api/timeline/${id}`, { method: 'DELETE' });
  }
};

export const boardAnnotationsApi = {
  list(campaignId: string) {
    return request<{ pins: InvestigationBoardPinItem[]; groups: InvestigationBoardGroup[] }>(`/api/campaigns/${campaignId}/board/annotations`);
  },
  createPin(campaignId: string, input: { text: string; x: number; y: number; color?: string }) {
    return request<InvestigationBoardPinItem>(`/api/campaigns/${campaignId}/board/annotations`, { method: 'POST', body: JSON.stringify({ kind: 'pin', ...input }) });
  },
  updatePin(id: string, input: Partial<{ text: string; x: number; y: number; color: string }>) {
    return request<InvestigationBoardPinItem>(`/api/board/annotations/pins/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  removePin(id: string) {
    return request(`/api/board/annotations/pins/${id}`, { method: 'DELETE' });
  },
  createGroup(campaignId: string, input: { name: string; color?: string; x: number; y: number; width?: number; height?: number; boardNodeIds?: string[] }) {
    return request<InvestigationBoardGroup>(`/api/campaigns/${campaignId}/board/annotations`, { method: 'POST', body: JSON.stringify({ kind: 'group', ...input }) });
  },
  updateGroup(id: string, input: Partial<{ name: string; color: string; x: number; y: number; width: number; height: number; boardNodeIds: string[] }>) {
    return request<InvestigationBoardGroup>(`/api/board/annotations/groups/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  removeGroup(id: string) {
    return request(`/api/board/annotations/groups/${id}`, { method: 'DELETE' });
  }
};

export const boardViewsApi = {
  list(campaignId: string) {
    return request<{ views: InvestigationBoardViewItem[]; warnings: string[] }>(`/api/campaigns/${campaignId}/board/views`);
  },
  create(campaignId: string, input: { name: string; kind: InvestigationBoardViewKind; description?: string | null; order?: number; snapshot: InvestigationBoardViewSnapshot }) {
    return request<InvestigationBoardViewItem>(`/api/campaigns/${campaignId}/board/views`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: Partial<{ name: string; kind: InvestigationBoardViewKind; description: string | null; order: number; snapshot: InvestigationBoardViewSnapshot }>) {
    return request<InvestigationBoardViewItem>(`/api/board/views/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(id: string) {
    return request(`/api/board/views/${id}`, { method: 'DELETE' });
  },
  reorder(campaignId: string, viewIds: string[]) {
    return request<{ views: InvestigationBoardViewItem[]; warnings: string[] }>(`/api/campaigns/${campaignId}/board/views/reorder`, { method: 'PUT', body: JSON.stringify({ viewIds }) });
  }
};

export const boardApi = {
  get(campaignId: string) {
    return request<{ nodes: BoardNodeItem[]; edges: BoardEdgeItem[] }>(`/api/campaigns/${campaignId}/board`);
  },
  dropFile(campaignId: string, fileId: string, x: number, y: number) {
    return request<BoardNodeItem>(`/api/campaigns/${campaignId}/board`, {
      method: 'POST',
      body: JSON.stringify({ fileId, x, y })
    });
  },
  moveNode(fileId: string, x: number, y: number) {
    return request(`/api/board/nodes/${fileId}`, { method: 'PATCH', body: JSON.stringify({ fileId, x, y }) });
  },
  updatePositions(campaignId: string, positions: Array<{ fileId: string; x: number; y: number }>) {
    return request<{ positions: Array<{ id: string; fileId: string; x: number; y: number }> }>(`/api/campaigns/${campaignId}/board/positions`, { method: 'PUT', body: JSON.stringify({ positions }) });
  },
  removeNode(nodeId: string) {
    return request(`/api/board/nodes/remove/${nodeId}`, { method: 'DELETE' });
  },
  createEdge(input: { campaignId: string; fromNodeId: string; toNodeId: string; label?: string; color?: string; description?: string; curve?: number }) {
    return request<BoardEdgeItem>(`/api/board/edges`, { method: 'POST', body: JSON.stringify(input) });
  },
  updateEdge(id: string, input: Partial<{ label: string | null; color: string; description: string | null; curve: number }>) {
    return request<BoardEdgeItem>(`/api/board/edges/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  removeEdge(id: string) {
    return request(`/api/board/edges/${id}`, { method: 'DELETE' });
  }
};

export const hypothesesApi = {
  list(campaignId: string, status?: HypothesisStatus) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<InvestigationHypothesis[]>(`/api/campaigns/${campaignId}/hypotheses${query}`);
  },
  get(campaignId: string, hypothesisId: string) {
    return request<InvestigationHypothesis>(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}`);
  },
  create(campaignId: string, input: { title: string; summary?: string | null }) {
    return request<InvestigationHypothesis>(`/api/campaigns/${campaignId}/hypotheses`, { method: 'POST', body: JSON.stringify(input) });
  },
  update(campaignId: string, hypothesisId: string, input: { title?: string; summary?: string | null; status?: HypothesisStatus }) {
    return request<InvestigationHypothesis>(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(campaignId: string, hypothesisId: string) {
    return request(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}`, { method: 'DELETE' });
  },
  addEvidence(campaignId: string, hypothesisId: string, input: { fileId: string; stance: EvidenceStance; note?: string | null; order?: number }) {
    return request<HypothesisEvidence>(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}/evidence`, { method: 'POST', body: JSON.stringify(input) });
  },
  updateEvidence(campaignId: string, hypothesisId: string, evidenceId: string, input: { stance?: EvidenceStance; note?: string | null; order?: number }) {
    return request<HypothesisEvidence>(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}/evidence/${evidenceId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  removeEvidence(campaignId: string, hypothesisId: string, evidenceId: string) {
    return request(`/api/campaigns/${campaignId}/hypotheses/${hypothesisId}/evidence/${evidenceId}`, { method: 'DELETE' });
  }
};

export const sessionPlansApi = {
  list(campaignId: string) {
    return request<SessionPlanning[]>(`/api/campaigns/${campaignId}/session-plans`);
  },
  create(campaignId: string, input: { name: string; date?: string | null; summary?: string | null; checklist?: unknown; objectives?: unknown; agenda?: unknown; postSummary?: string | null; status?: 'PLANNED' | 'COMPLETED'; order?: number; fileIds?: string[]; hypothesisIds?: string[]; viewIds?: string[] }) {
    return request<SessionPlanning>(`/api/campaigns/${campaignId}/session-plans`, { method: 'POST', body: JSON.stringify(input) });
  },
  get(sessionId: string) {
    return request<SessionPlanning>(`/api/session-plans/${sessionId}`);
  },
  update(sessionId: string, input: Partial<{ name: string; date: string | null; summary: string | null; checklist: unknown; objectives: unknown; agenda: unknown; postSummary: string | null; status: 'PLANNED' | 'COMPLETED'; order: number; fileIds: string[]; hypothesisIds: string[]; viewIds: string[] }>) {
    return request<SessionPlanning>(`/api/session-plans/${sessionId}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  remove(sessionId: string) {
    return request(`/api/session-plans/${sessionId}`, { method: 'DELETE' });
  }
};

export const transferApi = {
  validate(document: unknown, identityMode: CampaignImportIdentityMode = 'REMAP') {
    return request<CampaignImportDryRun>('/api/campaigns/import/validate', {
      method: 'POST',
      body: JSON.stringify({ document, identityMode })
    });
  },
  import(document: CampaignExportDocument, identityMode: CampaignImportIdentityMode) {
    return request<{ campaign: Campaign; validation: CampaignTransferValidation }>('/api/campaigns/import', {
      method: 'POST',
      body: JSON.stringify({ document, identityMode, confirm: true })
    });
  },
  exportUrl(campaignId: string, format: 'json' | 'backup' | 'markdown' | 'pdf' | 'visual') {
    return `/api/campaigns/${campaignId}/export?format=${format}`;
  }
};

export const playerModeApi = {
  get(campaignId: string) {
    return request<{ config: PlayerModeConfigData; files: PlayerVisibilityRow[] }>(`/api/campaigns/${campaignId}/player-mode`);
  },
  setEnabled(campaignId: string, isEnabled: boolean) {
    return request<PlayerModeConfigData>(`/api/campaigns/${campaignId}/player-mode`, {
      method: 'POST',
      body: JSON.stringify({ isEnabled })
    });
  },
  setFileVisibility(fileId: string, isVisible: boolean) {
    return request(`/api/files/${fileId}/visibility`, { method: 'POST', body: JSON.stringify({ isVisible }) });
  },
  getAuthenticated(campaignId: string) {
    return request<PublicCampaignData>(`/api/campaigns/${campaignId}/player-view`);
  },
  previewMember(campaignId: string, userId: string) {
    return request<PlayerAccessPreviewData>(`/api/campaigns/${campaignId}/player-preview/${userId}`);
  },
  getPublic(shareSlug: string) {
    return request<PublicCampaignData>(`/api/player/${shareSlug}`);
  }
};
