export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { proposalGenie } from '@/lib/services/proposal-genie';
import { documentGenerator } from '@/lib/services/document-generator';
import type {
  ProposalSection,
  GanttTask,
  StaffingRow,
} from '@/lib/services/document-generator';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function fileResponse(doc: { buffer: Buffer; filename: string; mimeType: string }) {
  return json({
    success: true,
    document: {
      filename: doc.filename,
      mimeType: doc.mimeType,
      buffer: doc.buffer.toString('base64'),
    },
  });
}

/** Split assembled proposal markdown into Word sections. Drops cover-page sections (Word has its own cover). */
function splitProposalSections(markdown: string): ProposalSection[] {
  const sections: ProposalSection[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: ProposalSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!current) return;
    const body = buffer.join('\n').trim();
    if (body) current.markdown = body;
    sections.push(current);
    current = null;
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      flush();
      current = { heading: heading[1].trim() };
    } else if (current) {
      buffer.push(line);
    } else if (line.trim()) {
      // Leading content before any heading
      if (sections.length === 0) current = { markdown: '' };
      if (current && !current.heading) buffer.push(line);
    }
  }
  flush();

  // Drop cover-page sections (rendered separately by the Word generator)
  return sections.filter(s => !s.heading || !/cover/i.test(s.heading));
}

/** Parse proposal markdown into deck sections (## heading + bullet points). */
function parseDeckSections(markdown: string): { section: string; points: string[] }[] {
  const result: { section: string; points: string[] }[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: { section: string; points: string[] } | null = null;

  for (const line of lines) {
    const heading = line.match(/^#{1,2}\s+(.+)/);
    if (heading) {
      if (current && !/cover/i.test(current.section)) result.push(current);
      current = { section: heading[1].trim(), points: [] };
    } else if (current) {
      const bullet = line.trim().match(/^[-*+]\s+(.+)/);
      if (bullet) current.points.push(bullet[1].trim());
    }
  }
  if (current && !/cover/i.test(current.section)) result.push(current);

  return result.filter(s => s.points.length > 0 || s.section.toLowerCase() !== 'table of contents');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, brandId, projectId, model, winThemes, sections } = body || {};

    if (!brandId || !projectId) {
      return json({ success: false, error: 'brandId and projectId are required' }, 400);
    }

    const opts = { brandId, projectId, model };

    switch (action) {
      case 'cover-page': {
        const markdown = await proposalGenie.generateCoverPage(opts);
        return json({ success: true, markdown });
      }

      case 'win-themes': {
        const markdown = await proposalGenie.integrateWinThemes(opts, winThemes);
        return json({ success: true, markdown });
      }

      case 'competition': {
        const markdown = await proposalGenie.analyzeCompetition(opts);
        return json({ success: true, markdown });
      }

      case 'write-sections': {
        const markdown = await proposalGenie.writeSections(opts, sections);
        return json({ success: true, markdown });
      }

      case 'assemble': {
        const markdown = await proposalGenie.assembleProposal(opts, body.parts);
        return json({ success: true, markdown });
      }

      case 'generate-presentations': {
        const data = await proposalGenie.generatePresentations(opts, body.markdown);
        return json({ success: true, ...data });
      }

      // ---------- Exports ----------

      case 'export-word': {
        const markdown: string = body.markdown || '';
        if (!markdown.trim()) {
          return json({ success: false, error: 'No proposal markdown to export' }, 400);
        }
        const doc = await documentGenerator.createProposalWordDocument({
          title: body.cover?.title || body.title || 'Proposal',
          cover: body.cover,
          proprietaryNotice: body.proprietaryNotice,
          sections: splitProposalSections(markdown),
          pageBreakBetweenSections: true,
          fontSize: body.fontSize,
        });
        return fileResponse(doc);
      }

      case 'export-capture-deck': {
        const markdown: string = body.markdown || '';
        const sections = markdown.trim()
          ? parseDeckSections(markdown)
          : (body.deck?.sections || []);
        const doc = await documentGenerator.createCaptureDeckPresentation(
          body.title || 'Capture Deck',
          {
            companyName: body.companyName,
            date: body.date,
            logoBase64: body.logoBase64,
            sections,
          }
        );
        return fileResponse(doc);
      }

      case 'export-quad-chart': {
        const doc = await documentGenerator.createQuadChartPresentation(
          body.title || 'Quad Chart',
          body.quadrants || [],
          { pageTitle: body.pageTitle }
        );
        return fileResponse(doc);
      }

      case 'export-gantt': {
        const tasks: GanttTask[] = body.tasks || [];
        if (tasks.length === 0) {
          return json({ success: false, error: 'No schedule tasks to render' }, 400);
        }
        const doc = await documentGenerator.createGanttPresentation(
          body.title || 'Proposal Schedule',
          tasks,
          { unitLabel: body.unitLabel, unitCount: body.unitCount }
        );
        return fileResponse(doc);
      }

      case 'export-staffing': {
        const staffing: StaffingRow[] = body.staffing || [];
        if (staffing.length === 0) {
          return json({ success: false, error: 'No staffing data to render' }, 400);
        }
        const doc = await documentGenerator.createStaffingReportPresentation(
          body.title || 'Staffing Report',
          staffing,
          { subtitle: body.subtitle }
        );
        return fileResponse(doc);
      }

      default:
        return json(
          {
            success: false,
            error:
              'Unknown action. Use: cover-page, win-themes, competition, write-sections, assemble, export-word, export-capture-deck, export-quad-chart, export-gantt, export-staffing',
          },
          400
        );
    }
  } catch (error) {
    console.error('[Proposals API] Error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      500
    );
  }
}
