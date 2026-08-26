import Link from 'next/link';
import styles from './page.module.css';

const example = `{
  "format": "rpg-campaign-studio",
  "version": 1,
  "exportedAt": "2026-08-19T12:00:00.000Z",
  "campaign": {
    "id": "campaign-source-id",
    "name": "A Casa sem Janelas",
    "description": "Uma investigação em uma cidade isolada.",
    "system": "ORDEM_PARANORMAL",
    "coverImage": null
  },
  "customSystem": {
    "attributes": [],
    "skills": [],
    "classes": [],
    "races": []
  },
  "files": [
    {
      "id": "file-source-id",
      "type": "NPC",
      "name": "Dra. Helena",
      "description": "Médica responsável pelo sanatório.",
      "content": "Anotações e informações narrativas.",
      "authorId": "author-source-id",
      "data": { "sheet": { "hp": 12 } },
      "isFavorite": true,
      "isArchived": false,
      "isTrashed": false,
      "trashedAt": null,
      "createdAt": "2026-08-19T12:00:00.000Z",
      "updatedAt": "2026-08-19T12:00:00.000Z",
      "tags": ["tag-clues"],
      "attachments": [],
      "comments": [],
      "history": []
    }
  ],
  "tags": [
    { "id": "tag-clues", "name": "Pistas", "color": "#7B5CFF", "icon": "Search", "description": null }
  ],
  "relationships": [],
  "favoriteFolders": [],
  "sessions": [],
  "timelineEvents": [],
  "board": { "nodes": [], "edges": [] },
  "playerMode": { "isEnabled": false, "visibility": [] }
}`;

export default function JsonDocumentationPage({ params }: { params: { id: string } }) {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>V5 · Contrato oficial</span>
          <h1 className={styles.title}>Template JSON de campanhas</h1>
          <p className={styles.subtitle}>Use este formato para backups, integrações e campanhas geradas por IA.</p>
        </div>
        <Link href={`/campaigns/${params.id}/importar-exportar`} className={styles.backLink}>Voltar para importação e exportação</Link>
      </div>

      <section className={styles.panel}>
        <h2>Princípios do formato</h2>
        <p>O template é um snapshot independente dos IDs internos do banco. Os IDs de origem são preservados no arquivo para que o importador consiga reconstruir tags, relacionamentos, favoritos, sessões, timeline e quadro de investigação com novos IDs.</p>
        <p>O campo <code>format</code> deve ser <code>rpg-campaign-studio</code> e <code>version</code> deve ser <code>1</code>. O importador valida toda a estrutura antes de criar qualquer registro.</p>
        <p>O campo <code>authorId</code> preserva a autoria textual do arquivo, comentários e histórico. Em fichas de sistema personalizado, referências como <code>classId</code>, <code>raceId</code>, <code>attributeId</code>, <code>skillId</code> e as chaves de <code>attributes</code>/<code>skills</code> são remapeadas para os novos IDs criados durante a importação.</p>
      </section>

      <section className={styles.panel}>
        <h2>Estrutura de alto nível</h2>
        <div className={styles.fieldGrid}>
          <div><code>campaign</code><span>Metadados da campanha, sistema e capa.</span></div>
          <div><code>customSystem</code><span>Atributos, perícias, classes e raças quando o sistema é personalizado.</span></div>
          <div><code>files</code><span>Arquivos polimórficos, conteúdo, dados específicos, tags, anexos e histórico.</span></div>
          <div><code>tags</code><span>Catálogo de tags referenciadas pelos arquivos.</span></div>
          <div><code>relationships</code><span>Ligações direcionais entre IDs de arquivos.</span></div>
          <div><code>favoriteFolders</code><span>Pastas e posições dos arquivos favoritos.</span></div>
          <div><code>sessions</code><span>Sessões, checklist, resumo e arquivos relacionados.</span></div>
          <div><code>timelineEvents</code><span>Eventos cronológicos ligados opcionalmente a arquivos.</span></div>
          <div><code>board</code><span>Nós, posições e conexões do Quadro de Investigação.</span></div>
          <div><code>playerMode</code><span>Visibilidade por arquivo; o modo é importado desligado por segurança.</span></div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>Campos de arquivo</h2>
        <p>Cada item de <code>files</code> representa um <code>CampaignFile</code>. O campo <code>type</code> aceita <code>NPC</code>, <code>CHARACTER</code>, <code>PUZZLE</code>, <code>DOCUMENT</code>, <code>CLUE</code>, <code>OBJECT</code>, <code>EVENT</code>, <code>SESSION</code>, <code>MAP</code>, <code>IMAGE</code>, <code>AUDIO</code>, <code>VIDEO</code>, <code>NOTE</code> e <code>LOCATION</code>. O objeto livre <code>data</code> mantém os campos específicos da ficha ou do tipo.</p>
      </section>

      <section className={styles.panel}>
        <h2>Exemplo mínimo completo</h2>
        <pre className={styles.code}>{example}</pre>
      </section>
    </main>
  );
}
