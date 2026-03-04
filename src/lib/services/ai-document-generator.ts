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
- Categories are consistent`
};

export interface GenerateFromPromptParams {
  prompt: string;
  type: 'word' | 'slide' | 'cell';
  title?: string;
  rawContent?: string;
}

export async function generateDocumentFromPrompt(params: GenerateFromPromptParams): Promise<GeneratedDocument> {
  const { prompt, type, title = 'Untitled', rawContent } = params;

  const systemPrompt = DOCUMENT_PROMPTS[type];
  
  // Combine prompt with raw content if provided
  const userPrompt = rawContent 
    ? `Here is the raw content to transform into a ${type === 'word' ? 'document' : type === 'slide' ? 'presentation' : 'spreadsheet'}:\n\n${rawContent}\n\n${prompt}`
    : prompt;

  console.log(`[Document AI] Generating ${type} from prompt...`);

  let result;
  try {
    result = await chatCompletion({
      model: 'glm-4.7-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    });
  } catch (error) {
    console.error('[Document AI] chatCompletion error:', error);
    throw new Error(`AI model failed to respond: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Only log errors, not successful generation
  if (!content || content.length < 10) {
    throw new Error('AI generated insufficient content. Please try a different prompt.');
  }

  // Parse the content based on type
  switch (type) {
    case 'word':
      return await generateWordFromContent(title, content);
    case 'slide':
      return await generateSlidesFromContent(title, content);
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

async function generateSlidesFromContent(title: string, content: string): Promise<GeneratedDocument> {
  // Clean up content - remove markdown code blocks
  let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Try to parse as JSON first
  try {
    const slides = JSON.parse(cleanContent);
    
    if (Array.isArray(slides) && slides[0]?.title && Array.isArray(slides[0]?.bulletPoints)) {
      const pptx = new PptxGenJS();
      pptx.title = title;
      pptx.author = 'AI Dashboard';
      
      for (const slideData of slides) {
        const slide = pptx.addSlide();
        slide.addText(slideData.title, {
          x: 0.5, y: 0.5, w: '90%', h: 1,
          fontSize: 32, bold: true, color: '363636',
        });
        if (slideData.bulletPoints?.length > 0) {
          slide.addText(
            slideData.bulletPoints.map((point: string) => ({ text: point, options: { bullet: true } })),
            { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, color: '363636', valign: 'top' }
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
  } catch (e) {
    console.log('[Document AI] Not valid JSON, parsing manually');
  }

  // Parse manually - look for slide markers
  const slides: { title: string; bulletPoints: string[] }[] = [];
  const lines = cleanContent.split('\n');
  let currentSlide: { title: string; bulletPoints: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Look for numbered titles or heading markers
    if (/^(Slide\s*\d*[:.]?\s*|\d+[.)]\s+)/i.test(trimmed) || trimmed.startsWith('# ')) {
      if (currentSlide && currentSlide.bulletPoints.length > 0) {
        slides.push(currentSlide);
      }
      currentSlide = {
        title: trimmed.replace(/^(Slide\s*\d*[:.]?\s*|\d+[.)]\s*|#\s*)/i, '').trim() || 'Untitled Slide',
        bulletPoints: []
      };
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      if (currentSlide) {
        currentSlide.bulletPoints.push(trimmed.replace(/^[-•*]\s*/, ''));
      } else {
        // No slide yet, create one
        currentSlide = { title: title, bulletPoints: [trimmed.replace(/^[-•*]\s*/, '')] };
      }
    } else if (currentSlide && !currentSlide.title) {
      currentSlide.title = trimmed;
    }
  }

  if (currentSlide) {
    slides.push(currentSlide);
  }

  // If no slides found, create from paragraphs
  if (slides.length === 0) {
    const paragraphs = cleanContent.split(/\n\n+/).filter(p => p.trim());
    slides.push({
      title: title,
      bulletPoints: paragraphs.slice(0, 6).map(p => p.substring(0, 200))
    });
  }

  const pptx = new PptxGenJS();
  pptx.title = title;
  pptx.author = 'AI Dashboard';
  
  // Add title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, {
    x: 0.5, y: 2, w: '90%', h: 1.5,
    fontSize: 44, bold: true, color: '363636', align: 'center' as const,
  });
  
  for (const slideData of slides) {
    const slide = pptx.addSlide();
    slide.addText(slideData.title, {
      x: 0.5, y: 0.5, w: '90%', h: 1,
      fontSize: 32, bold: true, color: '363636',
    });
    if (slideData.bulletPoints?.length > 0) {
      slide.addText(
        slideData.bulletPoints.map(point => ({ text: point, options: { bullet: true } })),
        { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, color: '363636', valign: 'top' }
      );
    }
  }

  const buf = pptx.write({ outputType: 'nodebuffer' }) as unknown as Buffer;
  return {
    buffer: buf,
    filename: `${title}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}

async function generateSpreadsheetFromContent(title: string, content: string): Promise<GeneratedDocument> {
  // Try to parse as JSON first
  try {
    const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(jsonContent);
    
    if (data.headers && Array.isArray(data.rows)) {
      return documentGenerator.createSpreadsheet(title, {
        headers: data.headers,
        rows: data.rows
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
      rows: lines.map(l => [l.trim()])
    });
  }

  // Try to detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  const headers = firstLine.split(delimiter).map(h => h.trim());
  const rows = lines.slice(1).map(line => 
    line.split(delimiter).map(cell => cell.trim())
  );

  return documentGenerator.createSpreadsheet(title, { headers, rows });
}

// Quick generation functions
export async function quickGenerateWord(prompt: string, title?: string): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'word', title });
}

export async function quickGenerateSlides(prompt: string, title?: string): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'slide', title });
}

export async function quickGenerateSpreadsheet(prompt: string, title?: string): Promise<GeneratedDocument> {
  return generateDocumentFromPrompt({ prompt, type: 'cell', title });
}