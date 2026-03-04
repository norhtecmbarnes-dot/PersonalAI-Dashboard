import { NextRequest, NextResponse } from 'next/server';
import { onlyOfficeService } from '@/lib/integrations/onlyoffice';
import { streamChatCompletion } from '@/lib/models/sdk.server';
import { memoryFileService } from '@/lib/services/memory-file';

// ==================== SPREADSHEET AI FEATURES ====================

const SPREADSHEET_ANALYZE_PROMPT = `Analyze this spreadsheet data and provide insights:

Data:
{data}

Provide:
1. Summary of what the data shows
2. Key patterns or trends
3. Notable outliers or anomalies
4. Statistical summary (if numeric)
5. Recommendations based on the data

Be concise and actionable.`;

const SPREADSHEET_FORMULA_PROMPT = `Generate a spreadsheet formula for the following requirement:

Requirement: {requirement}

Available columns: {columns}

Provide ONLY the formula, nothing else. Use standard spreadsheet formula syntax (Excel/Google Sheets compatible).`;

const SPREADSHEET_CLEAN_PROMPT = `Clean and standardize this data:

{data}

Instructions: {instructions}

Provide the cleaned data in the same format (CSV), with no explanations.`;

const SPREADSHEET_CHART_PROMPT = `Suggest the best chart type and configuration for this data:

Data:
{data}

Purpose: {purpose}

Respond in JSON format:
{
  "chartType": "bar|line|pie|scatter|area|etc",
  "title": "Chart title",
  "xAxis": "column name",
  "yAxis": "column name",
  "series": ["column names"],
  "reason": "why this chart type"
}`;

const SPREADSHEET_PREDICT_PROMPT = `Based on this historical data, predict the next values:

Data:
{data}

Prediction type: {predictionType}

Provide predictions with brief reasoning.`;

// ==================== PRESENTATION AI FEATURES ====================

const PRESENTATION_BULLETS_PROMPT = `Convert this content into clear, impactful bullet points for a presentation slide:

Content:
{content}

Style: {style}

Provide ONLY the bullet points, one per line, starting with •.`;

const PRESENTATION_SPEAKER_NOTES_PROMPT = `Create speaker notes for this slide:

Slide Title: {title}
Slide Content:
{content}

Provide detailed speaker notes that expand on the key points, include transitions, and suggest engagement techniques.`;

const PRESENTATION_OUTLINE_PROMPT = `Create a presentation outline for this topic:

Topic: {topic}

Audience: {audience}
Duration: {duration} minutes
Purpose: {purpose}

Create an outline with:
- Title slide
- 5-8 content slides
- Conclusion slide

Format:
# Title: [Presentation Title]

## Slide 1: [Title]
- Bullet 1
- Bullet 2
- Bullet 3

## Slide 2: [Title]
...`;

const PRESENTATION_IMPROVE_PROMPT = `Improve this presentation slide:

Current:
Title: {title}
Content:
{content}

Provide an improved version with:
1. More impactful title
2. Clearer bullet points
3. Speaker note suggestion
4. Visual suggestion`;

const PRESENTATION_SUMMARY_PROMPT = `Summarize this presentation into key takeaways:

Slides:
{slides}

Provide:
1. Main message (1 sentence)
2. 3-5 key takeaways
3. Call to action`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, action, data, model } = body;

    // Use provided model or default to glm-4.7-flash
    const selectedModel = model || 'glm-4.7-flash';

    console.log('[Office AI] Request:', { type, action, model: selectedModel });

    // Get memory context for personalization
    let memoryContext = '';
    try {
      memoryContext = memoryFileService.getSystemPrompt();
    } catch (e) {
      // Continue without memory
    }

    // ==================== SPREADSHEET OPERATIONS ====================
    if (type === 'spreadsheet') {
      switch (action) {
        case 'analyze': {
          const { spreadsheetData } = data;
          if (!spreadsheetData) {
            return NextResponse.json({ error: 'spreadsheetData required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: memoryContext + '\n\nYou are a data analyst expert.' },
              { role: 'user', content: SPREADSHEET_ANALYZE_PROMPT.replace('{data}', spreadsheetData) }
            ],
            temperature: 0.3,
            maxTokens: 2000,
          });

          return NextResponse.json({
            success: true,
            analysis: (result.message as any)?.content || String(result.message),
          });
        }

        case 'formula': {
          const { requirement, columns } = data;
          if (!requirement) {
            return NextResponse.json({ error: 'requirement required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a spreadsheet formula expert. Provide ONLY the formula, no explanations.' },
              { role: 'user', content: SPREADSHEET_FORMULA_PROMPT
                .replace('{requirement}', requirement)
                .replace('{columns}', columns?.join(', ') || 'A, B, C, D, E') }
            ],
            temperature: 0.1,
            maxTokens: 200,
          });

          return NextResponse.json({
            success: true,
            formula: (result.message as any)?.content || String(result.message),
          });
        }

        case 'clean': {
          const { spreadsheetData, instructions } = data;
          if (!spreadsheetData) {
            return NextResponse.json({ error: 'spreadsheetData required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a data cleaning expert. Output ONLY the cleaned CSV data.' },
              { role: 'user', content: SPREADSHEET_CLEAN_PROMPT
                .replace('{data}', spreadsheetData)
                .replace('{instructions}', instructions || 'Standardize formatting, remove duplicates, fix inconsistencies') }
            ],
            temperature: 0.1,
            maxTokens: 4000,
          });

          return NextResponse.json({
            success: true,
            cleanedData: (result.message as any)?.content || String(result.message),
          });
        }

        case 'chart': {
          const { spreadsheetData, purpose } = data;
          if (!spreadsheetData) {
            return NextResponse.json({ error: 'spreadsheetData required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a data visualization expert. Respond ONLY with valid JSON.' },
              { role: 'user', content: SPREADSHEET_CHART_PROMPT
                .replace('{data}', spreadsheetData)
                .replace('{purpose}', purpose || 'Visualize the data effectively') }
            ],
            temperature: 0.3,
            maxTokens: 500,
          });

          let chartConfig;
          try {
            const content = (result.message as any)?.content || String(result.message);
            chartConfig = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || '{}');
          } catch {
            chartConfig = { chartType: 'bar', title: 'Data Chart', reason: 'Default chart type' };
          }

          return NextResponse.json({
            success: true,
            chartConfig,
          });
        }

        case 'predict': {
          const { spreadsheetData, predictionType } = data;
          if (!spreadsheetData) {
            return NextResponse.json({ error: 'spreadsheetData required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: memoryContext + '\n\nYou are a forecasting expert.' },
              { role: 'user', content: SPREADSHEET_PREDICT_PROMPT
                .replace('{data}', spreadsheetData)
                .replace('{predictionType}', predictionType || 'next 5 periods') }
            ],
            temperature: 0.4,
            maxTokens: 1000,
          });

          return NextResponse.json({
            success: true,
            predictions: (result.message as any)?.content || String(result.message),
          });
        }

        case 'generate-data': {
          const { prompt, rows } = data;
          if (!prompt) {
            return NextResponse.json({ error: 'prompt required' }, { status: 400 });
          }

          const genPrompt = `Generate realistic spreadsheet data for: ${prompt}

Number of rows: ${rows || 10}

Output as CSV with headers. No explanations, just the data.`;

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a data generator. Output ONLY valid CSV data.' },
              { role: 'user', content: genPrompt }
            ],
            temperature: 0.7,
            maxTokens: 2000,
          });

          const content = (result.message as any)?.content || String(result.message);
          
          // Parse CSV to structured data
          const lines = content.split('\n').filter((l: string) => l.trim());
          const headers = lines[0]?.split(',').map((h: string) => h.trim()) || [];
          const dataRows = lines.slice(1).map((l: string) => l.split(',').map((c: string) => c.trim()));

          return NextResponse.json({
            success: true,
            csv: content,
            headers,
            rows: dataRows,
          });
        }

        default:
          return NextResponse.json({ error: 'Invalid spreadsheet action' }, { status: 400 });
      }
    }

    // ==================== PRESENTATION OPERATIONS ====================
    if (type === 'presentation') {
      switch (action) {
        case 'bullets': {
          const { content, style } = data;
          if (!content) {
            return NextResponse.json({ error: 'content required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a presentation expert. Create impactful bullet points.' },
              { role: 'user', content: PRESENTATION_BULLETS_PROMPT
                .replace('{content}', content)
                .replace('{style}', style || 'professional and concise') }
            ],
            temperature: 0.5,
            maxTokens: 1000,
          });

          const bullets = ((result.message as any)?.content || String(result.message))
            .split('\n')
            .filter((l: string) => l.trim())
            .map((l: string) => l.replace(/^[•\-\*]\s*/, ''));

          return NextResponse.json({
            success: true,
            bullets,
          });
        }

        case 'speaker-notes': {
          const { title, content } = data;
          if (!content) {
            return NextResponse.json({ error: 'content required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a presentation coach. Create helpful speaker notes.' },
              { role: 'user', content: PRESENTATION_SPEAKER_NOTES_PROMPT
                .replace('{title}', title || 'Slide')
                .replace('{content}', content) }
            ],
            temperature: 0.6,
            maxTokens: 500,
          });

          return NextResponse.json({
            success: true,
            speakerNotes: (result.message as any)?.content || String(result.message),
          });
        }

        case 'outline': {
          const { topic, audience, duration, purpose } = data;
          if (!topic) {
            return NextResponse.json({ error: 'topic required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: memoryContext + '\n\nYou are a presentation designer.' },
              { role: 'user', content: PRESENTATION_OUTLINE_PROMPT
                .replace('{topic}', topic)
                .replace('{audience}', audience || 'general audience')
                .replace('{duration}', String(duration || 15))
                .replace('{purpose}', purpose || 'inform') }
            ],
            temperature: 0.7,
            maxTokens: 2000,
          });

          return NextResponse.json({
            success: true,
            outline: (result.message as any)?.content || String(result.message),
          });
        }

        case 'improve': {
          const { title, content } = data;
          if (!content) {
            return NextResponse.json({ error: 'content required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a presentation improvement expert.' },
              { role: 'user', content: PRESENTATION_IMPROVE_PROMPT
                .replace('{title}', title || 'Untitled Slide')
                .replace('{content}', content) }
            ],
            temperature: 0.5,
            maxTokens: 1000,
          });

          return NextResponse.json({
            success: true,
            improvements: (result.message as any)?.content || String(result.message),
          });
        }

        case 'summary': {
          const { slides } = data;
          if (!slides) {
            return NextResponse.json({ error: 'slides required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a presentation summarizer.' },
              { role: 'user', content: PRESENTATION_SUMMARY_PROMPT.replace('{slides}', slides) }
            ],
            temperature: 0.3,
            maxTokens: 500,
          });

          return NextResponse.json({
            success: true,
            summary: (result.message as any)?.content || String(result.message),
          });
        }

        case 'create-from-outline': {
          const { outline } = data;
          if (!outline) {
            return NextResponse.json({ error: 'outline required' }, { status: 400 });
          }

          const result = await streamChatCompletion({
            model: selectedModel,
            messages: [
              { role: 'system', content: 'You are a presentation creator. Create detailed slide content from outlines.' },
              { role: 'user', content: `Create detailed presentation slides from this outline:

${outline}

For each slide, provide:
## Slide N: [Title]
Content:
- Bullet 1
- Bullet 2
- Bullet 3

Speaker Notes:
[Detailed notes for the speaker]` }
            ],
            temperature: 0.7,
            maxTokens: 4000,
          });

          return NextResponse.json({
            success: true,
            slides: (result.message as any)?.content || String(result.message),
          });
        }

        default:
          return NextResponse.json({ error: 'Invalid presentation action' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid type. Use "spreadsheet" or "presentation"' }, { status: 400 });
  } catch (error) {
    console.error('Office AI error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    spreadsheet: {
      actions: [
        { name: 'analyze', description: 'Analyze spreadsheet data for insights and patterns', params: ['spreadsheetData'] },
        { name: 'formula', description: 'Generate spreadsheet formula from requirement', params: ['requirement', 'columns'] },
        { name: 'clean', description: 'Clean and standardize data', params: ['spreadsheetData', 'instructions'] },
        { name: 'chart', description: 'Suggest best chart type and configuration', params: ['spreadsheetData', 'purpose'] },
        { name: 'predict', description: 'Predict future values from historical data', params: ['spreadsheetData', 'predictionType'] },
        { name: 'generate-data', description: 'Generate sample data from description', params: ['prompt', 'rows'] },
      ],
    },
    presentation: {
      actions: [
        { name: 'bullets', description: 'Convert content to bullet points', params: ['content', 'style'] },
        { name: 'speaker-notes', description: 'Generate speaker notes for a slide', params: ['title', 'content'] },
        { name: 'outline', description: 'Create presentation outline from topic', params: ['topic', 'audience', 'duration', 'purpose'] },
        { name: 'improve', description: 'Improve slide content', params: ['title', 'content'] },
        { name: 'summary', description: 'Summarize presentation into key takeaways', params: ['slides'] },
        { name: 'create-from-outline', description: 'Create detailed slides from outline', params: ['outline'] },
      ],
    },
  });
}