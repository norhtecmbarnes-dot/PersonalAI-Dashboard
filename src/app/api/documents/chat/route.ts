import { NextResponse } from 'next/server';
import { documentProcessor } from '@/lib/storage/document-processor';
import { validateString, sanitizeString } from '@/lib/utils/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, question } = body;

    // Validate documentId
    const documentIdValidation = validateString(documentId, 'documentId', {
      minLength: 1,
      maxLength: 100,
      required: true
    });
    if (!documentIdValidation.valid) {
      return NextResponse.json(
        { error: documentIdValidation.error },
        { status: 400 }
      );
    }

    // Validate question
    const questionValidation = validateString(question, 'question', {
      minLength: 1,
      maxLength: 10000,
      required: true
    });
    if (!questionValidation.valid) {
      return NextResponse.json(
        { error: questionValidation.error },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedDocumentId = sanitizeString(documentId);
    const sanitizedQuestion = sanitizeString(question);

    const result = await documentProcessor.chatWithDocument(sanitizedDocumentId, sanitizedQuestion);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Document chat error:', error);
    return NextResponse.json(
      { error: 'Failed to chat with document' },
      { status: 500 }
    );
  }
}
