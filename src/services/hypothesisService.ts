import { Prisma } from '@prisma/client';
import { assertCampaignRole, assertOwnedCampaignForWrite } from '@/lib/access';
import type { EvidenceStance, HypothesisStatus, InvestigationHypothesis, HypothesisEvidence } from '@/types';
import { prisma } from '@/lib/prisma';

const HYPOTHESIS_STATUSES: HypothesisStatus[] = ['OPEN', 'SUPPORTED', 'REFUTED', 'RESOLVED'];
const EVIDENCE_STANCES: EvidenceStance[] = ['SUPPORTS', 'CONTRADICTS', 'CONTEXT'];

type HypothesisWithEvidence = {
  id: string;
  campaignId: string;
  title: string;
  summary: string | null;
  status: HypothesisStatus;
  createdAt: Date;
  updatedAt: Date;
  evidence: Array<{
    id: string;
    hypothesisId: string;
    fileId: string;
    stance: EvidenceStance;
    note: string | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    file: { id: string; name: string; type: HypothesisEvidence['file']['type']; isTrashed: boolean; isArchived: boolean };
  }>;
};

export class HypothesisIntegrityError extends Error {
  status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'HypothesisIntegrityError';
    this.status = status;
  }
}

function assertHypothesisStatus(value: string): asserts value is HypothesisStatus {
  if (!HYPOTHESIS_STATUSES.includes(value as HypothesisStatus)) throw new HypothesisIntegrityError('Estado de hipótese inválido.');
}

function assertEvidenceStance(value: string): asserts value is EvidenceStance {
  if (!EVIDENCE_STANCES.includes(value as EvidenceStance)) throw new HypothesisIntegrityError('Posição da evidência inválida.');
}

function requiredTitle(title: string) {
  const normalized = title.trim();
  if (!normalized) throw new HypothesisIntegrityError('O título da hipótese é obrigatório.');
  if (normalized.length > 200) throw new HypothesisIntegrityError('O título da hipótese é muito longo.');
  return normalized;
}

function optionalText(value: string | null | undefined, maxLength: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new HypothesisIntegrityError('O texto informado é muito longo.');
  return normalized || null;
}

function isPrismaUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === 'P2002'
    : typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'P2002';
}

function serializeEvidence(evidence: HypothesisWithEvidence['evidence'][number]): HypothesisEvidence {
  return {
    id: evidence.id,
    hypothesisId: evidence.hypothesisId,
    fileId: evidence.fileId,
    stance: evidence.stance,
    note: evidence.note,
    order: evidence.order,
    createdAt: evidence.createdAt.toISOString(),
    updatedAt: evidence.updatedAt.toISOString(),
    file: evidence.file
  };
}

function serializeHypothesis(hypothesis: HypothesisWithEvidence): InvestigationHypothesis {
  return {
    id: hypothesis.id,
    campaignId: hypothesis.campaignId,
    title: hypothesis.title,
    summary: hypothesis.summary,
    status: hypothesis.status,
    createdAt: hypothesis.createdAt.toISOString(),
    updatedAt: hypothesis.updatedAt.toISOString(),
    evidence: hypothesis.evidence.map(serializeEvidence)
  };
}

const evidenceInclude = {
  file: { select: { id: true, name: true, type: true, isTrashed: true, isArchived: true } }
} satisfies Prisma.HypothesisEvidenceInclude;

const hypothesisInclude = {
  evidence: { include: evidenceInclude, orderBy: [{ stance: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }] }
} satisfies Prisma.InvestigationHypothesisInclude;

async function loadHypothesis(campaignId: string, hypothesisId: string, options: { write?: boolean } = {}) {
  if (options.write) await assertOwnedCampaignForWrite(campaignId);
  else await assertCampaignRole(campaignId, 'OWNER');
  const hypothesis = await prisma.investigationHypothesis.findFirst({ where: { id: hypothesisId, campaignId }, include: hypothesisInclude });
  if (!hypothesis) throw new HypothesisIntegrityError('Hipótese não encontrada.', 404);
  return hypothesis as HypothesisWithEvidence;
}

async function assertEvidenceFile(campaignId: string, fileId: string) {
  const file = await prisma.campaignFile.findFirst({
    where: { id: fileId, campaignId, isTrashed: false },
    select: { id: true, name: true, type: true, isTrashed: true, isArchived: true }
  });
  if (!file) throw new HypothesisIntegrityError('Arquivo não pertence à campanha ou está indisponível.', 422);
  return file;
}

export const hypothesisService = {
  async list(campaignId: string, status?: HypothesisStatus) {
    await assertCampaignRole(campaignId, 'OWNER');
    if (status) assertHypothesisStatus(status);
    const hypotheses = await prisma.investigationHypothesis.findMany({
      where: { campaignId, status },
      include: hypothesisInclude,
      orderBy: { updatedAt: 'desc' }
    });
    return (hypotheses as HypothesisWithEvidence[]).map(serializeHypothesis);
  },

  async get(campaignId: string, hypothesisId: string) {
    return serializeHypothesis(await loadHypothesis(campaignId, hypothesisId));
  },

  async create(campaignId: string, input: { title: string; summary?: string | null }) {
    await assertOwnedCampaignForWrite(campaignId);
    const hypothesis = await prisma.investigationHypothesis.create({
      data: { campaignId, title: requiredTitle(input.title), summary: optionalText(input.summary, 4000) ?? null },
      include: hypothesisInclude
    });
    return serializeHypothesis(hypothesis as HypothesisWithEvidence);
  },

  async update(campaignId: string, hypothesisId: string, input: { title?: string; summary?: string | null; status?: HypothesisStatus }) {
    await loadHypothesis(campaignId, hypothesisId, { write: true });
    if (input.status) assertHypothesisStatus(input.status);
    const hypothesis = await prisma.investigationHypothesis.update({
      where: { id: hypothesisId },
      data: {
        title: input.title === undefined ? undefined : requiredTitle(input.title),
        summary: optionalText(input.summary, 4000),
        status: input.status
      },
      include: hypothesisInclude
    });
    return serializeHypothesis(hypothesis as HypothesisWithEvidence);
  },

  async remove(campaignId: string, hypothesisId: string) {
    await loadHypothesis(campaignId, hypothesisId, { write: true });
    await prisma.investigationHypothesis.delete({ where: { id: hypothesisId } });
  },

  async addEvidence(campaignId: string, hypothesisId: string, input: { fileId: string; stance: EvidenceStance; note?: string | null; order?: number }) {
    await loadHypothesis(campaignId, hypothesisId, { write: true });
    assertEvidenceStance(input.stance);
    if (input.order !== undefined && (!Number.isInteger(input.order) || input.order < 0)) throw new HypothesisIntegrityError('A ordem da evidência é inválida.');
    const note = optionalText(input.note, 1000);
    const file = await assertEvidenceFile(campaignId, input.fileId);

    try {
      const evidence = await prisma.$transaction(async (tx) => {
        const existing = await tx.hypothesisEvidence.findUnique({ where: { hypothesisId_fileId: { hypothesisId, fileId: file.id } }, select: { id: true } });
        if (existing) throw new HypothesisIntegrityError('O arquivo já está vinculado a esta hipótese.', 409);
        const latest = input.order === undefined
          ? await tx.hypothesisEvidence.findFirst({ where: { hypothesisId }, orderBy: { order: 'desc' }, select: { order: true } })
          : null;
        return tx.hypothesisEvidence.create({
          data: { hypothesisId, fileId: file.id, stance: input.stance, note: note ?? null, order: input.order ?? ((latest?.order ?? -1) + 1) },
          include: evidenceInclude
        });
      });
      return serializeEvidence(evidence as HypothesisWithEvidence['evidence'][number]);
    } catch (error) {
      if (error instanceof HypothesisIntegrityError) throw error;
      if (isPrismaUniqueConstraintError(error)) throw new HypothesisIntegrityError('O arquivo já está vinculado a esta hipótese.', 409);
      throw error;
    }
  },

  async updateEvidence(campaignId: string, hypothesisId: string, evidenceId: string, input: { stance?: EvidenceStance; note?: string | null; order?: number }) {
    await loadHypothesis(campaignId, hypothesisId, { write: true });
    const existing = await prisma.hypothesisEvidence.findFirst({ where: { id: evidenceId, hypothesisId, hypothesis: { campaignId } }, include: evidenceInclude });
    if (!existing) throw new HypothesisIntegrityError('Evidência não encontrada.', 404);
    if (input.stance) assertEvidenceStance(input.stance);
    if (input.order !== undefined && (!Number.isInteger(input.order) || input.order < 0)) throw new HypothesisIntegrityError('A ordem da evidência é inválida.');
    const evidence = await prisma.hypothesisEvidence.update({ where: { id: evidenceId }, data: { stance: input.stance, note: optionalText(input.note, 1000), order: input.order }, include: evidenceInclude });
    return serializeEvidence(evidence as HypothesisWithEvidence['evidence'][number]);
  },

  async removeEvidence(campaignId: string, hypothesisId: string, evidenceId: string) {
    await loadHypothesis(campaignId, hypothesisId, { write: true });
    const existing = await prisma.hypothesisEvidence.findFirst({ where: { id: evidenceId, hypothesisId, hypothesis: { campaignId } }, select: { id: true } });
    if (!existing) throw new HypothesisIntegrityError('Evidência não encontrada.', 404);
    await prisma.hypothesisEvidence.delete({ where: { id: evidenceId } });
  }
};
