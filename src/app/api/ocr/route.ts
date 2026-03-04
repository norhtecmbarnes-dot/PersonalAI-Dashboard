export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sanitizeString } from '@/lib/utils/validation';
import { sqlDatabase } from '@/lib/database/sqlite';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/tiff'];

// Vision-capable models that can process images
const VISION_MODELS = [
  'glm-ocr',           // GLM OCR model
  'glm-4v',            // GLM Vision
  'llava',             // LLaVA
  'llava:13b',         // LLaVA 13B
  'bakllava',          // BakLLaVA
  'moondream',         // Moondream
  'moondream:1.8b',    // Moondream 1.8B
  'qwen-vl',           // Qwen Vision Language
  'qwen2-vl',          // Qwen2 Vision
];

async function getAvailableVisionModel(): Promise<string | null> {
  try {
    const { getOllamaModels } = await import('@/lib/models/sdk.server');
    const models = await getOllamaModels();
    
    // Check for vision models in order of preference
    for (const visionModel of VISION_MODELS) {
      const found = models.find((m: any) => 
        m.name === visionModel || m.name.startsWith(visionModel.split(':')[0])
      );
      if (found) {
        return found.name;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File | null;
    const method = formData.get('method') as string || 'auto'; // 'vision', 'tesseract', or 'auto'

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 20MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Allowed: PNG, JPEG, WEBP, BMP, TIFF' },
        { status: 400 }
      );
    }

    const imageBuffer = await image.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const mediaType = image.type || 'image/png';
    const dataUrl = `data:${mediaType};base64,${base64}`;

    // Try vision model first if auto or vision method
    if (method === 'auto' || method === 'vision') {
      const visionModel = await getAvailableVisionModel();
      
      if (visionModel) {
        try {
          const { streamChatCompletion } = await import('@/lib/models/sdk.server');
          
          // Use vision model with image
          const result = await streamChatCompletion({
            model: visionModel,
            messages: [
              {
                role: 'user',
                content: `Extract all text from this image. Return only the extracted text, no explanations or commentary.\n\n[Image provided]`,
              }
            ],
            maxTokens: 4000,
          });
          
          // For vision models, we need to use the chat completion API with the image
          // But streamChatCompletion doesn't support images yet, so we need a different approach
          // Fall back to Ollama direct API for vision models
          
          const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api';
          
          const visionResponse = await fetch(`${OLLAMA_API_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: visionModel,
              prompt: 'Extract all text from this image. Return only the extracted text, no explanations.',
              images: [base64],
              stream: false,
            }),
          });
          
          if (visionResponse.ok) {
            const visionData = await visionResponse.json();
            const text = visionData.response || '';
            
            if (text.trim()) {
              return NextResponse.json({
                text: sanitizeString(text.trim()),
                confidence: 0.95,
                method: 'vision',
                model: visionModel,
              });
            }
          }
        } catch (visionError) {
          console.warn('[OCR] Vision model failed, falling back to Tesseract:', visionError);
        }
      }
    }

    // Fallback to Tesseract
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    
    const result = await worker.recognize(dataUrl);
    await worker.terminate();

    return NextResponse.json({
      text: sanitizeString(result.data.text),
      confidence: result.data.confidence,
      words: result.data.words?.map((w: any) => ({
        text: sanitizeString(w.text),
        confidence: w.confidence,
        bbox: w.bbox,
      })),
      method: 'tesseract',
    });
  } catch (error) {
    console.error('OCR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    methods: ['vision', 'tesseract', 'auto'],
    description: 'OCR endpoint for extracting text from images',
    visionModels: VISION_MODELS,
    usage: {
      method: 'POST',
      body: {
        image: 'File (image/*)',
        method: 'vision | tesseract | auto (default: auto)',
      },
    },
  });
}