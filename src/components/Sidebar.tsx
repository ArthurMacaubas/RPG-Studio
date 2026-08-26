'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  Skull,
  MapPin,
  Package,
  Search,
  Puzzle,
  FileText,
  CalendarDays,
  BookOpen,
  Map,
  Network,
  Archive,
  Trash2,
  Eye,
  Settings,
  ArrowDownUp,
  BookMarked,
  Moon,
  Sun,
  ChevronRight,
  Mail,
  Radio,
  Menu,
  X
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useTheme } from '@/hooks/useTheme';
import { FavoritesSection } from './FavoritesSection';
import type { FavoriteFolder } from '@/types';
import type { CampaignRole } from '@/lib/access';

const NAV_ITEMS = [
  { href: '/arquivos', label: 'Todos os arquivos', icon: FolderOpen },
  { href: '/personagens', label: 'Personagens', icon: Users },
  { href: '/npcs', label: 'NPCs', icon: UserCog },
  { href: '/ameacas', label: 'Ameaças', icon: Skull },
  { href: '/locais', label: 'Locais', icon: MapPin },
  { href: '/objetos', label: 'Objetos', icon: Package },
  { href: '/pistas', label: 'Pistas', icon: Search },
  { href: '/puzzles', label: 'Puzzles', icon: Puzzle },
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/sessoes', label: 'Sessões', icon: BookOpen }
];

const INVESTIGATION_ITEMS = [
  { href: '/investigacao', label: 'Quadro de Investigação', icon: Network },
  { href: '/timeline', label: 'Timeline', icon: ChevronRight },
  { href: '/mapa', label: 'Mapas', icon: Map }
];

const PLAYER_NAV_ITEMS = [
  { href: '/jogador', label: 'Minha área', icon: Eye },
  { href: '/jogador/investigacao', label: 'Quadro compartilhado', icon: Network }
];

const UTILITY_ITEMS = [
  { href: '/arquivados', label: 'Arquivados', icon: Archive },
  { href: '/lixeira', label: 'Lixeira', icon: Trash2 },
  { href: '/modo-jogador', label: 'Modo Jogador', icon: Eye },
  { href: '/convites', label: 'Convites / Membros', icon: Mail },
  { href: '/importar-exportar', label: 'Importar / Exportar', icon: ArrowDownUp },
  { href: '/documentacao-json', label: 'Template JSON', icon: BookMarked },
  { href: '/configuracoes', label: 'Configurações', icon: Settings }
];

interface SidebarProps {
  campaignId: string;
  campaignName?: string;
  role?: CampaignRole;
  favoriteFolders?: FavoriteFolder[];
}

export function Sidebar({ campaignId, campaignName, role, favoriteFolders = [] }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const base = `/campaigns/${campaignId}`;

  const isActive = (href: string) => {
    const full = `${base}${href}`;
    return href === '' ? pathname === base : pathname?.startsWith(full);
  };

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <button type="button" className={styles.mobileToggle} onClick={() => setMobileOpen(true)} aria-label="Abrir navegação" aria-expanded={mobileOpen}>
        <Menu size={20} />
      </button>
      {mobileOpen && <button type="button" className={styles.mobileOverlay} onClick={closeMobile} aria-label="Fechar navegação" />}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`} aria-label="Navegação da campanha">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <div className={styles.brandCopy}><span>RPG Campaign Studio</span><small>{campaignName ?? 'Campanha'}</small></div>
          <button type="button" className={styles.mobileClose} onClick={closeMobile} aria-label="Fechar navegação"><X size={18} /></button>
        </div>

        <nav className={styles.section}>
          <div className={styles.sectionLabel}>Espaço de trabalho</div>
          {role === 'OWNER' && <Link href={base as never} className={`${styles.navItem} ${isActive('') ? styles.navItemActive : ''}`} onClick={closeMobile}><LayoutDashboard />Visão geral</Link>}
          {role === 'OWNER' && <Link href={`${base}/sala` as never} className={`${styles.navItem} ${isActive('/sala') ? styles.navItemActive : ''}`} onClick={closeMobile}><Radio />Sala de Sessão</Link>}
          {role === 'PLAYER' && PLAYER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return <Link key={item.label} href={`${base}${item.href}` as never} className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`} onClick={closeMobile}><Icon />{item.label}</Link>;
          })}
        </nav>

        {role !== 'PLAYER' && <FavoritesSection campaignId={campaignId} initialFolders={favoriteFolders} />}

        {role !== 'PLAYER' && <nav className={styles.section}>
          <div className={styles.sectionLabel}>Biblioteca</div>
          {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={`${base}${item.href}` as never}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
              onClick={closeMobile}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
        </nav>}

        {role === 'OWNER' && <nav className={styles.section}>
          <div className={styles.sectionLabel}>Investigação</div>
          {INVESTIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            return <Link key={item.label} href={`${base}${item.href}` as never} className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`} onClick={closeMobile}><Icon />{item.label}</Link>;
          })}
        </nav>}

        {role === 'OWNER' && <nav className={styles.section}>
          <div className={styles.sectionLabel}>Ferramentas e gestão</div>
          {UTILITY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={`${base}${item.href}` as never}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
              onClick={closeMobile}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
        </nav>}

        <div className={styles.spacer} />
        <div className={styles.footer}>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'dark' ? 'claro' : 'escuro'}`}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
      </aside>
    </>
  );
}
