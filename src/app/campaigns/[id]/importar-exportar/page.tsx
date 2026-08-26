'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Check, FileJson, FileText, FolderArchive, Loader2, Upload, X } from 'lucide-react';
import { transferApi } from '@/lib/api';
import type { CampaignExportDocument, CampaignImportDryRun, CampaignImportIdentityMode, CampaignTransferValidation } from '@/types';
import styles from './page.module.css';

const EXPORT_OPTIONS = [
  { format: 'json' as const, label: 'JSON oficial', detail: 'Formato editável e compatível com importação.', icon: FileJson },
  { format: 'backup' as const, label: 'Backup completo', detail: 'Cópia integral da campanha, incluindo metadados.', icon: FolderArchive },
  { format: 'markdown' as const, label: 'Markdown', detail: 'Conteúdo legível para documentação e versionamento.', icon: FileText },
  { format: 'pdf' as const, label: 'PDF', detail: 'Relatório pronto para leitura e compartilhamento.', icon: FileText },
  { format: 'visual' as const, label: 'Caderno visual', detail: 'HTML estilizado, navegável e pronto para imprimir.', icon: FileText }
];

export default function ImportarExportarPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params?.id ?? '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [sourceDocument, setSourceDocument] = useState<unknown>(null);
  const [document, setDocument] = useState<CampaignExportDocument | null>(null);
  const [validation, setValidation] = useState<CampaignTransferValidation | null>(null);
  const [dryRun, setDryRun] = useState<CampaignImportDryRun | null>(null);
  const [identityMode, setIdentityMode] = useState<CampaignImportIdentityMode>('REMAP');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function runDryRun(source: unknown, mode: CampaignImportIdentityMode) {
    setReading(true);
    setError('');
    setMessage('');
    try {
      const result = await transferApi.validate(source, mode);
      setDryRun(result);
      setValidation(result.validation);
      if (result.canImport) setDocument(source as CampaignExportDocument);
      else setDocument(null);
    } catch (cause) {
      setValidation(null);
      setDryRun(null);
      setDocument(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível executar o dry run do JSON.');
    } finally {
      setReading(false);
    }
  }

  async function readFile(file: File) {
    setFileName(file.name);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      setSourceDocument(parsed);
      await runDryRun(parsed, identityMode);
    } catch (cause) {
      setValidation(null);
      setDryRun(null);
      setDocument(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível ler o arquivo JSON.');
    }
  }

  function changeIdentityMode(mode: CampaignImportIdentityMode) {
    setIdentityMode(mode);
    if (sourceDocument) void runDryRun(sourceDocument, mode);
  }

  async function importCampaign() {
    if (!document || !validation?.valid) return;
    setImporting(true);
    setError('');
    try {
      const result = await transferApi.import(document, identityMode);
      setMessage(`Campanha importada com ${result.validation.summary.files} arquivos. Redirecionando...`);
      window.setTimeout(() => router.push(`/campaigns/${result.campaign.id}`), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar a campanha.');
    } finally {
      setImporting(false);
    }
  }

  function clearImport() {
    setFileName('');
    setSourceDocument(null);
    setDocument(null);
    setValidation(null);
    setDryRun(null);
    setError('');
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <main className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <span className={styles.eyebrow}>V5 · Transferência</span>
          <h1 className={styles.title}>Importar e exportar</h1>
          <p className={styles.subtitle}>Faça backup da campanha, compartilhe o conteúdo ou restaure um template validado.</p>
        </div>
        <Link href={`/campaigns/${campaignId}/documentacao-json`} className={styles.docsLink}>
          <FileJson size={15} />
          Documentação do JSON
        </Link>
      </div>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div className={styles.headingIcon}><ArrowDownToLine size={16} /></div>
          <div>
            <h2>Exportar campanha</h2>
            <p>Todos os formatos são gerados a partir do mesmo snapshot consistente da campanha.</p>
          </div>
        </div>
        <div className={styles.exportGrid}>
          {EXPORT_OPTIONS.map(({ format, label, detail, icon: Icon }) => (
            <a key={format} href={transferApi.exportUrl(campaignId, format)} className={styles.exportCard} download>
              <span className={styles.exportIcon}><Icon size={17} /></span>
              <span className={styles.exportLabel}>{label}</span>
              <span className={styles.exportDetail}>{detail}</span>
              <span className={styles.downloadHint}>Baixar <ArrowDownToLine size={13} /></span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div className={styles.headingIcon}><ArrowUpFromLine size={16} /></div>
          <div>
            <h2>Importar campanha</h2>
            <p>Selecione um JSON oficial. Primeiro executaremos um dry run; a campanha só será criada após validação concluída e confirmação explícita.</p>
          </div>
        </div>

        <div className={styles.identityControl}><label htmlFor="identity-mode">Modo de importação</label><select id="identity-mode" value={identityMode} disabled={reading || importing} onChange={(event) => changeIdentityMode(event.target.value as CampaignImportIdentityMode)}><option value="REMAP">Remapear todos os IDs</option><option value="PRESERVE_WHEN_AVAILABLE">Preservar IDs quando disponíveis</option></select><small>{sourceDocument ? 'A troca de modo executa um novo dry run antes de liberar a confirmação.' : 'Escolha como os IDs do arquivo serão tratados antes de selecionar o JSON.'}</small></div>

        <label className={styles.dropzone}>
          <input ref={inputRef} type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} />
          <Upload size={20} />
          <strong>{reading ? 'Validando arquivo...' : 'Escolher arquivo JSON'}</strong>
          <span>O conteúdo é verificado no servidor antes da importação.</span>
        </label>

        {fileName && (
          <div className={styles.selectedFile}>
            <FileJson size={15} />
            <span>{fileName}</span>
            <button type="button" onClick={clearImport} aria-label="Limpar arquivo"><X size={14} /></button>
          </div>
        )}

        {reading && <div className={styles.loading}><Loader2 size={15} className={styles.spin} /> Lendo e validando o template...</div>}
        {error && <div className={styles.error}><X size={15} /> {error}</div>}
        {message && <div className={styles.success}><Check size={15} /> {message}</div>}

        {validation && (
          <div className={`${styles.validation} ${validation.valid ? styles.validationOk : styles.validationError}`}>
            <div className={styles.validationHeader}>
              {validation.valid ? <Check size={17} /> : <X size={17} />}
              <strong>{validation.valid ? 'JSON pronto para importar' : 'JSON precisa de ajustes'}</strong>
            </div>
            <div className={styles.summaryGrid}>
              <span><b>{validation.summary.files}</b> arquivos</span>
              <span><b>{validation.summary.tags}</b> tags</span>
              <span><b>{validation.summary.relationships}</b> relacionamentos</span>
              <span><b>{validation.summary.sessions}</b> sessões</span>
              <span><b>{validation.summary.timelineEvents}</b> eventos</span>
              <span><b>{validation.summary.boardNodes}</b> nós no quadro</span>
            </div>
            {dryRun && <div className={styles.importPlan}>
              <div><strong>Plano de identidade</strong><span>{dryRun.identityPlan.strategy === 'REMAP_ALL' ? 'Todos os IDs serão remapeados para a nova campanha.' : 'IDs disponíveis serão preservados; colisões serão remapeadas.'}</span></div>
              <small>{dryRun.identityPlan.files} arquivos · {dryRun.identityPlan.tags} tags · {dryRun.identityPlan.relationshipTypes} tipos · {dryRun.identityPlan.relationships} relações · {dryRun.identityPlan.customSystemEntities} itens de sistema personalizado</small>
            </div>}
            {validation.errors.length > 0 && (
              <div className={styles.issueBlock}>
                <strong>Erros encontrados</strong>
                {(validation.issues?.length ? validation.issues : validation.errors.map((message) => ({ path: 'document', rule: 'validation', message }))).map((item, index) => <div key={`${item.path}-${item.rule}-${index}`}><code>{item.path}</code><span>{item.message}</span><small>Regra: {item.rule}</small></div>)}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className={styles.warningBlock}>
                <strong>Avisos</strong>
                {validation.warnings.map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}
              </div>
            )}
            {dryRun?.canImport && document && (
              <button type="button" className={styles.importButton} onClick={importCampaign} disabled={importing}>
                {importing ? <Loader2 size={15} className={styles.spin} /> : <ArrowUpFromLine size={15} />}
                {importing ? 'Importando...' : 'Confirmar e criar campanha'}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
