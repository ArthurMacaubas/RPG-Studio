import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiErrors';
import { exportCampaign } from '@/services/campaignTransferService';
import { formatCampaignAsHtml, formatCampaignAsMarkdown, formatCampaignAsPdf } from '@/lib/campaignTransferRender';

function safeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'campanha';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await exportCampaign(params.id);
    const format = req.nextUrl.searchParams.get('format') ?? 'json';
    const fileName = safeFileName(document.campaign.name);

    if (format === 'markdown' || format === 'md') {
      return new Response(formatCampaignAsMarkdown(document), {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}.md"`
        }
      });
    }
    if (format === 'visual' || format === 'html') {
      return new Response(formatCampaignAsHtml(document), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}-caderno.html"`
        }
      });
    }
    if (format === 'pdf') {
      return new Response(formatCampaignAsPdf(document), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${fileName}.pdf"`
        }
      });
    }
    if (format !== 'json' && format !== 'backup') {
      return NextResponse.json({ error: 'Formato de exportação inválido.' }, { status: 422 });
    }

    return new Response(JSON.stringify(document, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}${format === 'backup' ? '-backup' : ''}.json"`
      }
    });
  } catch (error) {
    return apiErrorResponse(error, 'Não foi possível exportar a campanha.');
  }
}
