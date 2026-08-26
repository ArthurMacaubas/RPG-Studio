import { prisma } from '@/lib/prisma';
import type { HistoryAction } from '@/types';

// Every mutating fileService action calls this so the file's timeline
// (Criado, Editado, Arquivado, ...) stays complete without each caller
// having to remember to log it.
export function logHistory(fileId: string, action: HistoryAction, summary?: string, authorId?: string) {
  return prisma.fileHistoryEntry.create({
    data: { fileId, action, summary, authorId }
  });
}
