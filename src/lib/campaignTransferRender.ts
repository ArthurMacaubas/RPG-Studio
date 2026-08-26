import type { CampaignExportDocument } from '@/types';

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function cleanMarkdown(value: unknown) {
  return text(value).replace(/\r?\n/g, '\\n');
}

function stripMarkdown(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

export function formatCampaignAsMarkdown(document: CampaignExportDocument) {
  const lines: string[] = [];
  lines.push(`# ${cleanMarkdown(document.campaign.name)}`);
  lines.push('');
  lines.push(`> Exportação RPG Campaign Studio · formato v${document.version} · ${document.exportedAt}`);
  lines.push('');
  if (document.campaign.description) {
    lines.push(cleanMarkdown(document.campaign.description));
    lines.push('');
  }
  lines.push('## Visão geral');
  lines.push('');
  lines.push(`- **Sistema:** ${document.campaign.system}`);
  lines.push(`- **Arquivos:** ${document.files.length}`);
  lines.push(`- **Tags:** ${document.tags.length}`);
  lines.push(`- **Relacionamentos:** ${document.relationships.length}`);
  lines.push(`- **Sessões:** ${document.sessions.length}`);
  lines.push(`- **Eventos de timeline:** ${document.timelineEvents.length}`);
  lines.push(`- **Nós do quadro:** ${document.board.nodes.length}`);
  lines.push('');

  lines.push('## Arquivos');
  lines.push('');
  for (const file of document.files) {
    lines.push(`### ${cleanMarkdown(file.name)}`);
    lines.push('');
    lines.push(`- **Tipo:** ${file.type}`);
    lines.push(`- **ID de origem:** \`${file.id}\``);
    if (file.description) lines.push(`- **Descrição:** ${cleanMarkdown(file.description)}`);
    if (file.tags.length) lines.push(`- **Tags:** ${file.tags.map((tagId) => `\`${tagId}\``).join(', ')}`);
    if (file.content) {
      lines.push('');
      lines.push(file.content);
    }
    if (Object.keys(file.data).length) {
      lines.push('');
      lines.push('#### Dados específicos');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(file.data, null, 2));
      lines.push('```');
    }
    if (file.attachments.length) {
      lines.push('');
      lines.push('#### Anexos');
      lines.push('');
      for (const attachment of file.attachments) {
        lines.push(`- [${cleanMarkdown(attachment.label || attachment.url)}](${attachment.url})`);
      }
    }
    lines.push('');
  }

  lines.push('## Relacionamentos');
  lines.push('');
  if (!document.relationships.length) lines.push('Nenhum relacionamento exportado.');
  for (const relationship of document.relationships) {
    lines.push(`- \`${relationship.fromId}\` **${relationship.kind}** \`${relationship.toId}\`${relationship.label ? ` — ${cleanMarkdown(relationship.label)}` : ''}`);
  }
  lines.push('');

  lines.push('## Sessões');
  lines.push('');
  if (!document.sessions.length) lines.push('Nenhuma sessão exportada.');
  for (const session of document.sessions) {
    lines.push(`### ${cleanMarkdown(session.name)}`);
    lines.push('');
    if (session.date) lines.push(`- **Data:** ${session.date}`);
    if (session.summary) lines.push(`- **Resumo:** ${cleanMarkdown(session.summary)}`);
    lines.push(`- **Arquivos relacionados:** ${session.fileIds.length}`);
    lines.push('');
  }

  lines.push('## Timeline');
  lines.push('');
  if (!document.timelineEvents.length) lines.push('Nenhum evento exportado.');
  for (const event of document.timelineEvents) {
    lines.push(`- **${event.happenedAt}** — ${cleanMarkdown(event.title)}${event.fileId ? ` (arquivo \`${event.fileId}\`)` : ''}`);
  }
  lines.push('');

  lines.push('## Quadro de investigação');
  lines.push('');
  lines.push(`- Nós: ${document.board.nodes.length}`);
  lines.push(`- Conexões: ${document.board.edges.length}`);
  lines.push('');
  for (const edge of document.board.edges) {
    lines.push(`- \`${edge.fromFileId}\` → \`${edge.toFileId}\`${edge.label ? ` — ${cleanMarkdown(edge.label)}` : ''}`);
  }

  return `${lines.join('\n').trim()}\n`;
}

function escapePdfText(value: string) {
  return stripMarkdown(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapPdfText(value: string, maxLength = 92) {
  const normalized = stripMarkdown(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function formatCampaignAsPdf(document: CampaignExportDocument) {
  const markdown = formatCampaignAsMarkdown(document);
  const sourceLines = markdown.split('\n');
  const pages: string[][] = [];
  let page: string[] = [];
  for (const sourceLine of sourceLines) {
    const line = sourceLine.startsWith('```') ? '' : sourceLine.replace(/^#{1,6}\s*/, '').replace(/^[*-]\s+/, '• ');
    for (const wrapped of wrapPdfText(line)) {
      if (page.length >= 48) {
        pages.push(page);
        page = [];
      }
      page.push(wrapped);
    }
  }
  if (page.length) pages.push(page);
  if (!pages.length) pages.push(['Campanha sem conteúdo.']);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const fontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pagesObject = addObject('<< /Type /Pages /Kids [] /Count 0 >>');
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const commands = ['BT', '/F1 10 Tf', '50 760 Td', '13 TL'];
    pageLines.forEach((line, index) => {
      if (index > 0) commands.push('T*');
      commands.push(`(${escapePdfText(line)}) Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    const contentObject = addObject(`<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`);
    const pageObject = addObject(
      `<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >>`
    );
    pageIds.push(pageObject);
  }
  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function escapeHtml(value: unknown) {
  return text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function exportUrl(value: string) {
  return /^(?:https?:\/\/|data:image\/)/i.test(value) ? escapeHtml(value) : '#';
}

export function formatCampaignAsHtml(document: CampaignExportDocument) {
  const fileCards = document.files.map((file) => {
    const images = file.attachments.filter((attachment) => attachment.mimeType?.startsWith('image/') || /^data:image\//i.test(attachment.url));
    const imageMarkup = images.length ? `<div class="gallery">${images.map((attachment) => `<img src="${exportUrl(attachment.url)}" alt="${escapeHtml(attachment.label || file.name)}" />`).join('')}</div>` : '';
    const tags = file.tags.length ? `<div class="tags">${file.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : '';
    const body = file.content ? `<div class="body">${escapeHtml(file.content)}</div>` : '<div class="muted">Sem conteúdo textual adicional.</div>';
    return `<article class="file-card"><div class="file-kicker">${escapeHtml(file.type)}</div><h3>${escapeHtml(file.name)}</h3>${file.description ? `<p class="description">${escapeHtml(file.description)}</p>` : ''}${tags}${imageMarkup}${body}</article>`;
  }).join('');
  const timeline = document.timelineEvents.map((event) => `<li><strong>${escapeHtml(event.happenedAt)}</strong><span>${escapeHtml(event.title)}</span></li>`).join('');
  const relationships = document.relationships.map((edge) => `<li><strong>${escapeHtml(edge.kind)}</strong><span>${escapeHtml(edge.fromId)} → ${escapeHtml(edge.toId)}${edge.label ? ` · ${escapeHtml(edge.label)}` : ''}</span></li>`).join('');
  const generatedAt = escapeHtml(document.exportedAt);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(document.campaign.name)} · RPG Campaign Studio</title><style>
  :root{color-scheme:dark;--ink:#edf3ee;--muted:#a4b7b1;--bg:#0b1113;--panel:#152124;--gold:#c8a66a;--sage:#86aaa2;--line:#2b4141}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.65 Georgia,serif}main{max-width:1050px;margin:0 auto;padding:56px 34px 90px}.hero{padding:38px;border:1px solid var(--line);border-radius:24px;background:radial-gradient(circle at 85% 15%,rgba(200,166,106,.2),transparent 35%),linear-gradient(145deg,#172629,#0e1719)}.eyebrow,.file-kicker{color:var(--gold);font:700 11px/1.2 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}.hero h1{margin:13px 0 8px;font:700 clamp(32px,6vw,68px)/.98 Georgia,serif;letter-spacing:-.04em}.hero p{max-width:720px;color:var(--muted);font-size:18px}.meta,.summary{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.meta span,.summary span,.tags span{padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.03);color:var(--muted);font:11px ui-monospace,monospace}.section{margin-top:42px}.section h2{margin:0 0 15px;color:var(--gold);font-size:27px}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.summary span{display:grid;gap:3px;border-radius:14px}.summary b{color:var(--ink);font:700 23px Georgia,serif}.file-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.file-card{break-inside:avoid;padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--panel)}.file-card h3{margin:8px 0;color:var(--ink);font-size:22px}.description,.muted{color:var(--muted)}.tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.tags span{padding:4px 8px;color:var(--sage);font-size:10px}.body{padding-top:14px;border-top:1px solid var(--line);white-space:pre-wrap}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:15px 0}.gallery img{width:100%;height:130px;object-fit:cover;border-radius:10px;border:1px solid var(--line)}ul{margin:0;padding:0;list-style:none}li{display:flex;gap:14px;padding:10px 0;border-bottom:1px solid var(--line)}li strong{min-width:150px;color:var(--gold);font:12px ui-monospace,monospace}li span{color:var(--muted)}footer{margin-top:55px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font:11px ui-monospace,monospace}@media print{body{background:#fff;color:#172124}:root{--ink:#172124;--muted:#52615e;--panel:#f4f6f4;--gold:#80652e;--sage:#446a62;--line:#ccd8d3}main{padding:0}.hero,.file-card{break-inside:avoid;box-shadow:none}.section{break-before:auto}.gallery img{filter:none}}
</style></head><body><main><header class="hero"><div class="eyebrow">RPG Campaign Studio · caderno visual</div><h1>${escapeHtml(document.campaign.name)}</h1>${document.campaign.description ? `<p>${escapeHtml(document.campaign.description)}</p>` : ''}<div class="meta"><span>Sistema · ${escapeHtml(document.campaign.system)}</span><span>Gerado em · ${generatedAt}</span><span>Formato · v${escapeHtml(document.version)}</span></div></header><section class="section"><h2>Visão geral</h2><div class="summary"><span><b>${document.files.length}</b> arquivos</span><span><b>${document.tags.length}</b> tags</span><span><b>${document.relationships.length}</b> relações</span><span><b>${document.sessions.length}</b> sessões</span><span><b>${document.timelineEvents.length}</b> eventos</span></div></section><section class="section"><h2>Arquivos da campanha</h2><div class="file-grid">${fileCards || '<p class="muted">Nenhum arquivo exportado.</p>'}</div></section><section class="section"><h2>Timeline</h2><ul>${timeline || '<li><span>Nenhum evento exportado.</span></li>'}</ul></section><section class="section"><h2>Relacionamentos</h2><ul>${relationships || '<li><span>Nenhum relacionamento exportado.</span></li>'}</ul></section><footer>Documento visual gerado pelo RPG Campaign Studio · ${generatedAt}</footer></main></body></html>`;
}
