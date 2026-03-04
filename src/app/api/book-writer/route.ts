import { NextResponse } from 'next/server';
import { bookWriterService } from '@/lib/agent/book-writer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'init') {
      const progress = bookWriterService.initializeBook();
      return NextResponse.json({ success: true, progress });
    }

    if (action === 'writeNext') {
      const chapter = await bookWriterService.writeNextChapter();
      const progress = bookWriterService.getProgress();
      return NextResponse.json({ success: true, chapter, progress });
    }

    if (action === 'writeChapter') {
      const { chapterNumber } = body;
      const chapter = await bookWriterService.writeChapter(chapterNumber);
      const progress = bookWriterService.getProgress();
      return NextResponse.json({ success: true, chapter, progress });
    }

    if (action === 'fullBook') {
      const book = bookWriterService.getFullBook();
      return NextResponse.json({ success: true, book });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: init, writeNext, writeChapter, fullBook' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Book writer API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const progress = bookWriterService.getProgress();
    const shouldContinue = bookWriterService.shouldContinueWriting();
    
    return NextResponse.json({
      success: true,
      progress,
      canContinue: shouldContinue,
      nextChapter: progress?.currentChapter || 1,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
