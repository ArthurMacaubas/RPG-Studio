'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, List, Archive, Trash2, Star, StarOff, Copy, RotateCcw, X } from 'lucide-react';
import { FileCard } from './FileCard';
import { FileListRow } from './FileListRow';
import { NewFileModal } from './NewFileModal';
import { ContextMenu, type ContextMenuAction } from './ContextMenu';
import { Breadcrumb } from './Breadcrumb';
import { filesApi, tagsApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useSelection } from '@/hooks/useSelection';
import type { CampaignFile, ExplorerScope, FileType, SortField, Tag, ViewMode } from '@/types';
import { FILE_TYPE_LABELS } from '@/types';
import styles from './FileExplorer.module.css';

interface FileExplorerProps {
  campaignId: string;
  scope: ExplorerScope;
  fixedType?: FileType;
  title: string;
  breadcrumb: { label: string; href?: string }[];
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'updatedAt', label: 'Última alteração' },
  { value: 'createdAt', label: 'Data de criação' },
  { value: 'name', label: 'Nome' },
  { value: 'type', label: 'Tipo' }
];

export function FileExplorer({ campaignId, scope, fixedType, title, breadcrumb }: FileExplorerProps) {
  const router = useRouter();
  const [files, setFiles] = useState<CampaignFile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [sort, setSort] = useState<SortField>('updatedAt');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; file: CampaignFile } | null>(null);

  const { selected, toggle, selectOnly, clear, count } = useSelection();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fileResults, tagResults] = await Promise.all([
        filesApi.list(campaignId, {
          scope,
          type: fixedType,
          search: debouncedSearch || undefined,
          tagIds: activeTagIds.length ? activeTagIds : undefined,
          sort
        }),
        tagsApi.list(campaignId)
      ]);
      setFiles(fileResults);
      setTags(tagResults);
    } finally {
      setLoading(false);
    }
  }, [campaignId, scope, fixedType, debouncedSearch, activeTagIds, sort]);

  useEffect(() => {
    load();
  }, [load]);

  function openFile(file: CampaignFile) {
    router.push(`/campaigns/${campaignId}/arquivos/${file.id}` as never);
  }

  async function toggleFavorite(file: CampaignFile) {
    await filesApi.setFavorite(file.id, !file.isFavorite);
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, isFavorite: !f.isFavorite } : f)));
  }

  async function runBulk(action: 'archive' | 'restore' | 'trash' | 'restoreFromTrash' | 'permanentDelete') {
    await filesApi.bulk(Array.from(selected), action);
    clear();
    load();
  }

  function contextActionsFor(file: CampaignFile): ContextMenuAction[] {
    if (scope === 'trash') {
      return [
        { label: 'Restaurar', icon: <RotateCcw size={14} />, onClick: async () => { await filesApi.restoreFromTrash(file.id); load(); } },
        {
          label: 'Excluir permanentemente',
          icon: <Trash2 size={14} />,
          danger: true,
          divider: true,
          onClick: async () => { await filesApi.permanentDelete(file.id); load(); }
        }
      ];
    }
    if (scope === 'archived') {
      return [
        { label: 'Restaurar', icon: <RotateCcw size={14} />, onClick: async () => { await filesApi.restore(file.id); load(); } },
        {
          label: 'Mover para lixeira',
          icon: <Trash2 size={14} />,
          danger: true,
          divider: true,
          onClick: async () => { await filesApi.trash(file.id); load(); }
        }
      ];
    }
    return [
      {
        label: file.isFavorite ? 'Desfavoritar' : 'Favoritar',
        icon: file.isFavorite ? <StarOff size={14} /> : <Star size={14} />,
        onClick: () => toggleFavorite(file)
      },
      { label: 'Duplicar', icon: <Copy size={14} />, onClick: async () => { await filesApi.duplicate(file.id); load(); } },
      { label: 'Arquivar', icon: <Archive size={14} />, onClick: async () => { await filesApi.archive(file.id); load(); } },
      {
        label: 'Mover para lixeira',
        icon: <Trash2 size={14} />,
        danger: true,
        divider: true,
        onClick: async () => { await filesApi.trash(file.id); load(); }
      }
    ];
  }

  const emptyCopy = useMemo(() => {
    if (scope === 'trash') return { title: 'Lixeira vazia', body: 'Itens excluídos aparecem aqui até serem removidos definitivamente.' };
    if (scope === 'archived') return { title: 'Nada arquivado', body: 'Arquive itens pelo menu de ações para tirá-los da visualização principal.' };
    if (debouncedSearch || activeTagIds.length) return { title: 'Nenhum resultado', body: 'Ajuste a busca ou os filtros de tag.' };
    return {
      title: fixedType ? `Nenhum ${FILE_TYPE_LABELS[fixedType].toLowerCase()} ainda` : 'Nenhum arquivo ainda',
      body: 'Crie o primeiro pelo botão acima.'
    };
  }, [scope, debouncedSearch, activeTagIds, fixedType]);

  return (
    <div className={styles.page}>
      <Breadcrumb items={breadcrumb} />
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{title}</h1>
        {scope === 'active' && (
          <button className={styles.newButton} onClick={() => setShowNewModal(true)}>
            <Plus size={15} />
            Novo arquivo
          </button>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Pesquisar por nome, descrição, conteúdo, tag ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as SortField)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${viewMode === 'grid' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Visualização em grade"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="Visualização em lista"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {tags.length > 0 && (
        <div className={styles.tagFilterRow}>
          {tags.map((tag) => {
            const active = activeTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={`${styles.tagFilterChip} ${active ? styles.tagFilterChipActive : ''}`}
                onClick={() =>
                  setActiveTagIds((prev) => (active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]))
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {count > 0 && (
        <div className={styles.selectionBar}>
          <span>{count} selecionado(s)</span>
          <div className={styles.selectionSpacer} />
          {scope === 'active' && (
            <>
              <button className={styles.selectionButton} onClick={() => runBulk('archive')}>
                Arquivar
              </button>
              <button className={`${styles.selectionButton} ${styles.selectionButtonDanger}`} onClick={() => runBulk('trash')}>
                Mover para lixeira
              </button>
            </>
          )}
          {scope === 'archived' && (
            <>
              <button className={styles.selectionButton} onClick={() => runBulk('restore')}>
                Restaurar
              </button>
              <button className={`${styles.selectionButton} ${styles.selectionButtonDanger}`} onClick={() => runBulk('trash')}>
                Mover para lixeira
              </button>
            </>
          )}
          {scope === 'trash' && (
            <>
              <button className={styles.selectionButton} onClick={() => runBulk('restoreFromTrash')}>
                Restaurar
              </button>
              <button className={`${styles.selectionButton} ${styles.selectionButtonDanger}`} onClick={() => runBulk('permanentDelete')}>
                Excluir permanentemente
              </button>
            </>
          )}
          <button className={styles.selectionButton} onClick={clear}>
            <X size={13} />
          </button>
        </div>
      )}

      {!loading && files.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>{emptyCopy.title}</h3>
          <p>{emptyCopy.body}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onOpen={() => openFile(file)}
              onSelectToggle={(e) => {
                e.stopPropagation();
                toggle(file.id);
              }}
              onToggleFavorite={() => toggleFavorite(file)}
              onContextMenu={(e) => setMenu({ x: e.clientX, y: e.clientY, file })}
            />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {files.map((file) => (
            <FileListRow
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onOpen={() => openFile(file)}
              onSelectToggle={() => toggle(file.id)}
              onToggleFavorite={() => toggleFavorite(file)}
              onContextMenu={(e) => setMenu({ x: e.clientX, y: e.clientY, file })}
            />
          ))}
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} actions={contextActionsFor(menu.file)} onClose={() => setMenu(null)} />}

      {showNewModal && (
        <NewFileModal
          campaignId={campaignId}
          defaultType={fixedType}
          onClose={() => setShowNewModal(false)}
          onCreated={(file) => {
            setShowNewModal(false);
            openFile(file);
          }}
        />
      )}
    </div>
  );
}
