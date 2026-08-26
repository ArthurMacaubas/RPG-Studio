'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { favoriteFoldersApi } from '@/lib/api';
import type { FavoriteFolder } from '@/types';
import styles from './FavoritesSection.module.css';
import sidebarStyles from './Sidebar.module.css';

interface FavoritesSectionProps {
  campaignId: string;
  initialFolders: FavoriteFolder[];
}

export function FavoritesSection({ campaignId, initialFolders }: FavoritesSectionProps) {
  const [folders, setFolders] = useState<FavoriteFolder[]>(initialFolders);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function refresh() {
    setFolders(await favoriteFoldersApi.list(campaignId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function createFolder() {
    if (!newName.trim()) {
      setCreating(false);
      return;
    }
    await favoriteFoldersApi.create({ campaignId, name: newName.trim() });
    setNewName('');
    setCreating(false);
    refresh();
  }

  async function commitRename(id: string) {
    if (renameValue.trim()) {
      await favoriteFoldersApi.update(id, { name: renameValue.trim() });
    }
    setRenamingId(null);
    refresh();
  }

  async function toggleCollapse(folder: FavoriteFolder) {
    await favoriteFoldersApi.update(folder.id, { isCollapsed: !folder.isCollapsed });
    refresh();
  }

  async function removeFolder(id: string) {
    await favoriteFoldersApi.remove(id);
    refresh();
  }

  async function moveFolder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= folders.length) return;
    const reordered = [...folders];
    const a = reordered[index];
    const b = reordered[target];
    if (!a || !b) return;
    reordered[index] = b;
    reordered[target] = a;
    setFolders(reordered);
    await favoriteFoldersApi.reorder(reordered.map((f) => f.id));
  }

  async function handleDrop(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    setDragOverId(null);
    const fileId = e.dataTransfer.getData('text/file-id');
    if (!fileId) return;
    await favoriteFoldersApi.addEntry(folderId, fileId);
    refresh();
  }

  async function removeEntry(folderId: string, fileId: string) {
    await favoriteFoldersApi.removeEntry(folderId, fileId);
    refresh();
  }

  return (
    <div className={sidebarStyles.section}>
      <div className={sidebarStyles.sectionLabel}>Favoritos</div>

      {folders.map((folder, index) => (
        <div key={folder.id}>
          <div
            className={`${styles.folderHeader} ${dragOverId === folder.id ? styles.folderHeaderDragOver : ''}`}
            role="group"
            aria-label={`Pasta de favoritos ${folder.name}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverId(folder.id);
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => handleDrop(e, folder.id)}
          >
            <button
              className={styles.tinyButton}
              onClick={() => toggleCollapse(folder)}
              aria-label={folder.isCollapsed ? `Expandir ${folder.name}` : `Recolher ${folder.name}`}
              aria-expanded={!folder.isCollapsed}
            >
              <ChevronRight size={12} className={`${styles.chevron} ${folder.isCollapsed ? styles.chevronCollapsed : ''}`} />
            </button>

            {renamingId === folder.id ? (
              <input
                autoFocus
                className={styles.folderNameInput}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(folder.id)}
                onKeyDown={(e) => e.key === 'Enter' && commitRename(folder.id)}
              />
            ) : (
              <button className={styles.folderName} onClick={() => toggleCollapse(folder)} aria-expanded={!folder.isCollapsed} aria-label={`Abrir ou recolher ${folder.name}`}>
                {folder.name}
              </button>
            )}

            <div className={styles.folderActions}>
              <button className={styles.tinyButton} onClick={() => moveFolder(index, -1)} aria-label="Mover para cima">
                <ArrowUp size={11} />
              </button>
              <button className={styles.tinyButton} onClick={() => moveFolder(index, 1)} aria-label="Mover para baixo">
                <ArrowDown size={11} />
              </button>
              <button
                className={styles.tinyButton}
                onClick={() => {
                  setRenamingId(folder.id);
                  setRenameValue(folder.name);
                }}
                aria-label="Renomear separador"
              >
                <Pencil size={11} />
              </button>
              <button className={styles.tinyButton} onClick={() => removeFolder(folder.id)} aria-label="Excluir separador">
                <Trash2 size={11} />
              </button>
            </div>
          </div>

          {!folder.isCollapsed &&
            (folder.entries && folder.entries.length > 0 ? (
              folder.entries
                .filter((entry): entry is typeof entry & { file: NonNullable<typeof entry.file> } => Boolean(entry.file))
                .map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/campaigns/${campaignId}/arquivos/${entry.file.id}` as never}
                    className={styles.entryRow}
                    draggable
                    aria-label={`${entry.file.name}. Arraste para mover ou use o menu contextual para remover.`}
                    title="Arraste para outra pasta ou use o menu contextual para remover"
                    onDragStart={(e) => e.dataTransfer.setData('text/file-id', entry.file.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      removeEntry(folder.id, entry.file.id);
                    }}
                  >
                    <Star size={11} fill="currentColor" />
                    <span className={styles.entryName}>{entry.file.name}</span>
                  </Link>
                ))
            ) : (
              <div className={styles.emptyEntry}>Arraste arquivos aqui</div>
            ))}
        </div>
      ))}

      {creating ? (
        <div className={styles.newFolderRow}>
          <input
            autoFocus
            className={styles.newFolderInput}
            placeholder="Nome do separador"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={createFolder}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
          />
        </div>
      ) : (
        <button className={styles.newFolderRow} onClick={() => setCreating(true)} aria-label="Criar nova pasta de favoritos">
          <Plus size={12} />
          Novo separador
        </button>
      )}
    </div>
  );
}
