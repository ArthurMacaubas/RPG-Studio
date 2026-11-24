'use client';

import { useEffect, useRef, useState } from 'react';
import { Bold, Code2, Heading2, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Sparkles, Strikethrough, Undo2 } from 'lucide-react';
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown';
import styles from './DocumentEditor.module.css';

export interface DocumentEntityOption {
  id: string;
  name: string;
  type: string;
}

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  mode: 'visual' | 'markdown';
  entityOptions?: DocumentEntityOption[];
  entityHref?: (id: string) => string;
}

const commands = [
  { key: 'titulo', label: 'Título de seção', icon: Heading2 },
  { key: 'citacao', label: 'Citação', icon: Quote },
  { key: 'aviso', label: 'Aviso', icon: Sparkles },
  { key: 'imagem', label: 'Imagem', icon: ImagePlus },
  { key: 'divisor', label: 'Divisor', icon: Minus },
  { key: 'entidade', label: 'Entidade relacionada', icon: Link2 }
] as const;

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={styles.toolButton} onMouseDown={(event) => event.preventDefault()} onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

export function DocumentEditor({ content, onChange, mode, entityOptions = [], entityHref }: DocumentEditorProps) {
  const visualRef = useRef<HTMLDivElement>(null);
  const lastRenderedContent = useRef<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');

  useEffect(() => {
    if (mode !== 'visual' || !visualRef.current) return;
    if (lastRenderedContent.current === content && document.activeElement === visualRef.current) return;
    visualRef.current.innerHTML = markdownToHtml(content, entityHref);
    lastRenderedContent.current = content;
  }, [content, entityHref, mode]);

  function emitVisualChange() {
    if (!visualRef.current) return;
    const next = htmlToMarkdown(visualRef.current.innerHTML);
    lastRenderedContent.current = next;
    onChange(next);
    const match = visualRef.current.innerText.match(/(?:^|\s)\/([^\s]*)$/);
    setSlashQuery(match?.[1] ?? '');
  }

  function runCommand(command: string, value?: string) {
    visualRef.current?.focus();
    document.execCommand(command, false, value);
    emitVisualChange();
  }

  function insertHtml(html: string) {
    visualRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitVisualChange();
    setSlashQuery('');
  }

  function executeSlashCommand(key: (typeof commands)[number]['key']) {
    const entity = entityOptions[0];
    if (key === 'titulo') insertHtml('<h2>Nova seção</h2><p>Escreva aqui...</p>');
    if (key === 'citacao') insertHtml('<blockquote>Uma frase importante para esta história.</blockquote><p><br></p>');
    if (key === 'aviso') insertHtml('<blockquote data-callout="warning"><strong>Aviso</strong><br>Descreva o perigo ou a regra importante.</blockquote><p><br></p>');
    if (key === 'imagem') {
      const url = window.prompt('URL da imagem');
      if (url) insertHtml(`<p><img src="${url.replace(/"/g, '&quot;')}" alt="Imagem da campanha" /></p>`);
    }
    if (key === 'divisor') insertHtml('<hr><p><br></p>');
    if (key === 'entidade' && entity) insertHtml(`[[${entity.id}|${entity.name}]]&nbsp;`);
    if (key === 'entidade' && !entity) setSlashQuery('');
  }

  if (mode === 'markdown') {
    return (
      <div className={styles.markdownEditor}>
        <div className={styles.codeHeader}><span>Markdown</span><span>Ctrl/Cmd + S salva automaticamente</span></div>
        <textarea className={styles.markdownInput} value={content} onChange={(event) => onChange(event.target.value)} spellCheck={false} aria-label="Conteúdo em Markdown" />
      </div>
    );
  }

  return (
    <div className={styles.visualEditor}>
      <div className={styles.toolbar} role="toolbar" aria-label="Formatação do documento">
        <ToolbarButton label="Desfazer" onClick={() => runCommand('undo')}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Refazer" onClick={() => runCommand('redo')}><Redo2 size={15} /></ToolbarButton>
        <span className={styles.separator} />
        <select className={styles.headingSelect} aria-label="Nível do título" defaultValue="p" onChange={(event) => runCommand('formatBlock', event.target.value)}>
          <option value="p">Texto</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option><option value="h4">Título 4</option>
        </select>
        <ToolbarButton label="Negrito" onClick={() => runCommand('bold')}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Itálico" onClick={() => runCommand('italic')}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Riscado" onClick={() => runCommand('strikeThrough')}><Strikethrough size={15} /></ToolbarButton>
        <ToolbarButton label="Lista com marcadores" onClick={() => runCommand('insertUnorderedList')}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Lista numerada" onClick={() => runCommand('insertOrderedList')}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="Citação" onClick={() => runCommand('formatBlock', 'blockquote')}><Quote size={15} /></ToolbarButton>
        <ToolbarButton label="Bloco de código" onClick={() => insertHtml('<pre><code>código</code></pre>')}><Code2 size={15} /></ToolbarButton>
        <ToolbarButton label="Inserir link" onClick={() => { const url = window.prompt('URL do link'); if (url) runCommand('createLink', url); }}><Link2 size={15} /></ToolbarButton>
        <ToolbarButton label="Inserir divisor" onClick={() => insertHtml('<hr><p><br></p>')}><Minus size={15} /></ToolbarButton>
        <span className={styles.toolbarHint}>Digite / para comandos</span>
      </div>
      <div ref={visualRef} className={styles.visualInput} contentEditable suppressContentEditableWarning onInput={emitVisualChange} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') event.preventDefault(); }} aria-label="Editor visual do documento" role="textbox" />
      {slashQuery !== '' && (
        <div className={styles.commandMenu} role="menu" aria-label="Comandos do editor">
          {commands.filter((command) => command.key.includes(slashQuery.toLowerCase())).map((command) => { const Icon = command.icon; return <button type="button" role="menuitem" key={command.key} onMouseDown={(event) => event.preventDefault()} onClick={() => executeSlashCommand(command.key)}><Icon size={15} /><span><strong>/{command.key}</strong><small>{command.label}</small></span></button>; })}
          {slashQuery === 'entidade' && entityOptions.slice(0, 5).map((entity) => <button type="button" role="menuitem" key={entity.id} onClick={() => { insertHtml(`[[${entity.id}|${entity.name}]]&nbsp;`); }}><Link2 size={15} /><span><strong>{entity.name}</strong><small>{entity.type}</small></span></button>)}
        </div>
      )}
    </div>
  );
}
