import { chatCompletion } from '@/lib/models/sdk.server';
import { documentGenerator, GeneratedDocument } from './document-generator';
import PptxGenJS from 'pptxgenjs';

// Specialized system prompts for each document type
const DOCUMENT_PROMPTS = {
  word: `You are an expert document writer. Create professional, well-structured documents with:
- Clear headings and subheadings
- Proper paragraphs with good flow
- Professional language appropriate for business use
- Accurate and relevant content
- Proper formatting suggestions (which will be applied automatically)

Respond with the document content in plain text. Use clear paragraph breaks.

For structured documents, use this format:
## Heading 1
Content under heading 1

## Heading 2
Content under heading 2

Paragraphs should be well-written and professional.`,

  slide: `You are an expert presentation designer. Create professional, visually appealing slides with:
- Clear, concise bullet points (maximum 6 per slide)
- Impactful titles
- Logical flow between slides
- Professional business language
- Key takeaways highlighted

Respond with slides in this exact JSON format:
[
  {
    "title": "Slide Title Here",
    "bulletPoints": ["Point 1", "Point 2", "Point 3"]
  }
]

Make sure each slide has:
- A clear, descriptive title (5-8 words)
- 3-6 bullet points maximum
- Concise, impactful language
- Professional tone

Avoid walls of text. Each bullet should be one clear idea.`,

  cell: `You are an expert data analyst and spreadsheet designer. Create well-organized spreadsheets with:
- Clear column headers
- Logical data organization
- Appropriate data types (numbers, text, dates)
- Summary calculations where appropriate
- Clean formatting

Respond with data in this exact JSON format:
{
  "headers": ["Column 1", "Column 2", "Column 3"],
  "rows": [
    ["Data 1", "Data 2", "Data 3"],
    ["Data 4", "Data 5", "Data 6"]
  ]
}

Make sure:
- Headers are descriptive and concise
- Data is accurate and properly formatted
- Numbers use appropriate precision
- Categories are consistent`,
};

export interface GenerateFromPromptParams {
  prompt: string;
  type: 'word' | 'slide' | 'cell';
  title?: string;
  rawContent?: string;
  model?: string;
  theme?: 'default' | 'dark' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
  logo?: string;
}

export const PRESENTATION_THEMES: Record<
  string,
  {
    background: string;
    titleColor: string;
    textColor: string;
    accentColor: string;
  }
> = {
  default: {
    background: 'FFFFFF',
    titleColor: '363636',
    textColor: '363636',
    accentColor: '4A90D9',
  },
  dark: {
    background: '1F1F1F',
    titleColor: 'FFFFFF',
    textColor: 'E0E0E0',
    accentColor: 'BB86FC',
  },
  blue: {
    background: '1E3A5F',
    titleColor: 'FFFFFF',
    textColor: 'E8F4FF',
    accentColor: '64B5F6',
  },
  green: {
    background: '1B4332',
    titleColor: 'FFFFFF',
    textColor: 'D8F3DC',
    accentColor: '52B788',
  },
  red: {
    background: '9B1B30',
    titleColor: 'FFFFFF',
    textColor: 'FFEBEE',
    accentColor: 'EF5350',
  },
  purple: {
    background: '4A148C',
    titleColor: 'FFFFFF',
    textColor: 'F3E5F5',
    accentColor: 'AB47BC',
  },
  orange: {
    background: 'BF360C',
    titleColor: 'FFFFFF',
    textColor: 'FFF3E0',
    accentColor: 'FF7043',
  },
};

export async function generateDocumentFromPrompt(
  params: GenerateFromPromptParams
): Promise<GeneratedDocument> {
  const { prompt, type, title = 'Untitled', rawContent, model, theme, logo } = params;

  const systemPrompt = DOCUMENT_PROMPTS[type];

  // Combine prompt with raw content if provided
  const userPrompt = rawContent
    ? `Here is the raw content to transform into a ${type === 'word' ? 'document' : type === 'slide' ? 'presentation' : 'spreadsheet'}:

${rawContent}

${prompt}`
    : prompt;

  console.log(`[Document AI] Generating ${type} from prompt using model: ${model || 'default'}...`);

  let result;
  try {
    result = await chatCompletion({
      model: model || 'ollama/llama3.2:latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    });
  } catch (error) {
    console.error('[Document AI] chatCompletion error:', error);
    throw error;
  }

  if (!result) {
    throw new Error('AI model returned no response');
  }

  let content = result.message?.content || '';

  // Handle different content formats
  if (typeof content === 'object') {
    content = JSON.stringify(content);
  }

  content = String(content).trim();

  // Remove thinking/reasoning blocks that some models output
  content = content
    .replace(/<tool_call>think[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\{\s*\*[\s\S]*?\*\s*\}/g, '')
    .replace(/```thinking[\s\S]*?```/gi, '')
    .replace(/#####+\s*Thinking[\s\S]*?(?=####|$)/gi, '')
    .replace(/#####+\s*\u601d\u8003[\s\S]*?(?=####|$)/gi, '')
    .trim();

  // If content starts with thinking patterns, skip to the actual answer
  const thinkingPatterns = [
    /^(Okay|I need to|Let me|First,|Let's|I'll|I will|I should|The user)/i,
    /^[\s]*(?=[\*\-])/,
  ];

  // Find where actual content starts (marked by answer tag or clear content)
  const answerMatch = content.match(/<answer[\s\S]*?<\/answer>/i);
  if (answerMatch) {
    content = answerMatch[0]
      .replace(/<answer>/i, '')
      .replace(/<\/answer>/i, '')
      .trim();
  }

  // Only log errors, not successful generation
  if (!content || content.length < 10) {
    throw new Error('AI generated insufficient content. Please try a different prompt.');
  }

  // Parse the content based on type
  switch (type) {
    case 'word':
      return await generateWordFromContent(title, content);
    case 'slide':
      return await generateSlidesFromContent(title, content, theme, logo);
    case 'cell':
      return await generateSpreadsheetFromContent(title, content);
    default:
      throw new Error(`Unsupported document type: ${type}`);
  }
}

async function generateWordFromContent(title: string, content: string): Promise<GeneratedDocument> {
  // Parse sections from content
  const sections: { heading?: string; content: string[] }[] = [];
  const lines = content.split('\n');
  let currentSection: { heading?: string; content: string[] } = { content: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      // New section
      if (currentSection.content.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed.replace('## ', ''), content: [] };
    } else if (trimmed.startsWith('# ')) {
      // Main title, skip
      continue;
    } else if (trimmed) {
      currentSection.content.push(trimmed);
    }
  }

  if (currentSection.content.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  // If no sections found, treat as single content
  if (sections.length === 0) {
    const paragraphs = content
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p && !p.startsWith('#'));
    return documentGenerator.createWordDocument(title, paragraphs);
  }

  return documentGenerator.createWordDocumentFromSections(title, sections);
}

async function generateSlidesFromContent(
  title: string,
  content: string,
  theme?: string,
  logo?: string
): Promise<GeneratedDocument> {
  // Clean up content - remove markdown code blocks
  let cleanContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  let slides: { title: string; bulletPoints: string[] }[] = [];
  let parsedFromJson = false;

  // Try to parse as JSON first
  try {
    const slidesData = JSON.parse(cleanContent);

    if (
      Array.isArray(slidesData) &&
      slidesData[0]?.title &&
      Array.isArray(slidesData[0]?.bulletPoints)
    ) {
      slides = slidesData;
      parsedFromJson = true;
    }
  } catch (e) {
    console.log('[Document AI] Not valid JSON, parsing manually');
  }

  // Parse manually if not from JSON
  if (!parsedFromJson) {
    const lines = cleanContent.split('\n');
    let currentSlide: { title: string; bulletPoints: string[] } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Look for numbered titles or heading markers
      if (/^(Slide\s*\d*[:.]?\s*|\d+[.)]\s*)/i.test(trimmed) || trimmed.startsWith('# ')) {
        if (currentSlide && currentSlide.bulletPoints.length > 0) {
          slides.push(currentSlide);
        }
        currentSlide = {
          title:
            trimmed.replace(/^(Slide\s*\d*[:.]?\s*|\d+[.)]\s*|#\s*)/i, '').trim() ||
            'Untitled Slide',
          bulletPoints: [],
        };
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
        if (currentSlide) {
          currentSlide.bulletPoints.push(trimmed.replace(/^[-•*]\s*/, ''));
        } else {
          currentSlide = { title: title, bulletPoints: [trimmed.replace(/^[-•*]\s*/, '')] };
        }
      } else if (currentSlide && !currentSlide.title) {
        currentSlide.title = trimmed;
      }
    }

    if (currentSlide) {
      slides.push(currentSlide);
    }
  }

  // If no slides found, create from paragraphs
  if (slides.length === 0) {
    const paragraphs = cleanContent.split(/\n\n+/).filter(p => p.trim());
    slides.push({
      title: title,
      bulletPoints: paragraphs.slice(0, 6).map(p => p.substring(0, 200)),
    });
  }

  return createPresentationWithLogo(title, slides, theme, logo);
}

async function createPresentationWithLogo(
  title: string,
  slides: { title: string; bulletPoints: string[] }[],
  theme?: string,
  logo?: string
): Promise<GeneratedDocument> {
  const pptx = new PptxGenJS();
  pptx.title = title;
  pptx.author = 'AI Dashboard';

  const themeColors = PRESENTATION_THEMES[theme || 'default'] || PRESENTATION_THEMES.default;

  // Add logo to each slide if provided
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: themeColors.background };

  // Add logo to title slide if provided
  if (logo) {
    try {
      titleSlide.addImage({ data: logo, x: 0.3, y: 0.2, w: 0.8, h: 0.5 });
    } catch (e) {
      console.log('[Document AI] Could not add logo to title slide:', e);
    }
  }

  titleSlide.addText(title, {
    x: 0.5,
    y: 2,
    w: '90%',
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: themeColors.titleColor,
    align: 'center',
  });

  // Add content slides
  for (const slideData of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: themeColors.background };

    // Add logo to each slide
    if (logo) {
      try {
        slide.addImage({ data: logo, x: 0.3, y: 0.2, w: 0.8, h: 0.5 });
      } catch (e) {
        // Skip logo on this slide
      }
    }

    slide.addText(slideData.title, {
      x: 0.5,
      y: 0.8,
      w: '90%',
      h: 1,
      fontSize: 32,
      bold: true,
      color: themeColors.titleColor,
    });

    if (slideData.bulletPoints?.length > 0) {
      slide.addText(
        slideData.bulletPoints.map(point => ({ text: point, options: { bullet: true } })),
        {
          x: 0.5,
          y: 1.8,
          w: '90%',
          h: 4,
          fontSize: 18,
          color: themeColors.textColor,
          valign: 'top',
        }
      );
    }
  }

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  return {
    buffer: Buffer.from(buf as ArrayBuffer),
    filename: `${title}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}

async function generateSpreadsheetFromContent(
  title: string,
  content: string
): Promise<GeneratedDocument> {
  // Try to parse as JSON first
  try {
    const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(jsonContent);

    if (data.headers && Array.isArray(data.rows)) {
      return documentGenerator.createSpreadsheet(title, {
        headers: data.headers,
        rows: data.rows,
      });
    }

    if (Array.isArray(data)) {
      // Array of objects - convert to headers and rows
      const headers = Object.keys(data[0] || {});
      const rows = data.map(row => headers.map(h => row[h]));
      return documentGenerator.createSpreadsheet(title, { headers, rows });
    }
  } catch {
    // Not JSON, parse manually
  }

  // Parse as CSV-like content
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    // Create a simple table from the content
    return documentGenerator.createSpreadsheet(title, {
      headers: ['Content'],
      rows: lines.map(l => [l.trim()]),
    });
  }

  // Try to detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = firstLine.split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim()));

  return documentGenerator.createSpreadsheet(title, { headers, rows });
}

// Quick generation functions
export async function quickGenerateWord(
  prompt: string,
  title?: string
): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'word', title });
}

export async function quickGenerateSlides(
  prompt: string,
  title?: string
): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'slide', title });
}

export async function quickGenerateSpreadsheet(
  prompt: string,
  title?: string
): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'cell', title });
}
