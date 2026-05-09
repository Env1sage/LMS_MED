import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateHighlightDto {
  learningUnitId: string;
  chapterId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  color?: string;
  style?: string; // 'highlight' or 'underline'
}

interface CreateNoteDto {
  learningUnitId: string;
  chapterId: string;
  highlightId?: string;
  selectedText?: string;
  content: string;
}

interface CreateFlashcardDto {
  learningUnitId: string;
  chapterId: string;
  question: string;
  answer: string;
  sourceText?: string;
}

interface UpdateHighlightDto {
  color?: string;
  selectedText?: string;
}

interface UpdateNoteDto {
  content?: string;
}

@Injectable()
export class AnnotationsService {
  constructor(private prisma: PrismaService) {}

  // ==================== HIGHLIGHTS ====================

  async createHighlight(userId: string, dto: CreateHighlightDto) {
    // Verify user has access to the learning unit
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: dto.learningUnitId },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    // Create highlight
    const stripNull = (s?: string) => s?.replace(/\0/g, '');
    const highlight = await this.prisma.highlights.create({
      data: {
        userId,
        learningUnitId: dto.learningUnitId,
        chapterId: dto.chapterId,
        selectedText: stripNull(dto.selectedText) || dto.selectedText,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
        color: dto.color || 'yellow',
        style: dto.style || 'highlight',
      },
    });

    // Track analytics
    await this.trackAnnotationEvent(userId, 'highlightCreated', {
      highlightId: highlight.id,
      learningUnitId: dto.learningUnitId,
      chapterId: dto.chapterId,
    });

    return highlight;
  }

  async getHighlights(userId: string, learningUnitId: string, chapterId?: string) {
    const where: any = {
      userId,
      learningUnitId,
    };

    if (chapterId) {
      where.chapterId = chapterId;
    }

    return this.prisma.highlights.findMany({
      where,
      include: {
        notes: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateHighlight(userId: string, highlightId: string, dto: UpdateHighlightDto) {
    // Verify ownership
    const highlight = await this.prisma.highlights.findFirst({
      where: {
        id: highlightId,
        userId,
      },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found or unauthorized');
    }

    return this.prisma.highlights.update({
      where: { id: highlightId },
      data: dto,
    });
  }

  async deleteHighlight(userId: string, highlightId: string) {
    // Verify ownership
    const highlight = await this.prisma.highlights.findFirst({
      where: {
        id: highlightId,
        userId,
      },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found or unauthorized');
    }

    // Delete associated notes first (cascade will handle this)
    await this.prisma.highlights.delete({
      where: { id: highlightId },
    });

    return { success: true };
  }

  // ==================== NOTES ====================

  async createNote(userId: string, dto: CreateNoteDto) {
    // Verify user has access to the learning unit
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: dto.learningUnitId },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    // If highlightId provided, verify ownership
    if (dto.highlightId) {
      const highlight = await this.prisma.highlights.findFirst({
        where: {
          id: dto.highlightId,
          userId,
        },
      });

      if (!highlight) {
        throw new NotFoundException('Highlight not found or unauthorized');
      }
    }

    const note = await this.prisma.notes.create({
      data: {
        userId,
        learningUnitId: dto.learningUnitId,
        chapterId: dto.chapterId,
        highlightId: dto.highlightId,
        selectedText: dto.selectedText?.replace(/\0/g, ''),
        content: dto.content?.replace(/\0/g, ''),
      },
    });

    // Track analytics
    await this.trackAnnotationEvent(userId, 'noteCreated', {
      noteId: note.id,
      learningUnitId: dto.learningUnitId,
      chapterId: dto.chapterId,
      hasHighlight: !!dto.highlightId,
    });

    return note;
  }

  async getNotes(userId: string, learningUnitId: string, chapterId?: string) {
    const where: any = {
      userId,
      learningUnitId,
    };

    if (chapterId) {
      where.chapterId = chapterId;
    }

    return this.prisma.notes.findMany({
      where,
      include: {
        highlight: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    // Verify ownership
    const note = await this.prisma.notes.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found or unauthorized');
    }

    return this.prisma.notes.update({
      where: { id: noteId },
      data: dto,
    });
  }

  async deleteNote(userId: string, noteId: string) {
    // Verify ownership
    const note = await this.prisma.notes.findFirst({
      where: {
        id: noteId,
        userId,
      },
    });

    if (!note) {
      throw new NotFoundException('Note not found or unauthorized');
    }

    await this.prisma.notes.delete({
      where: { id: noteId },
    });

    return { success: true };
  }

  // ==================== FLASHCARDS ====================

  async createFlashcard(userId: string, dto: CreateFlashcardDto) {
    // Verify user has access to the learning unit
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: dto.learningUnitId },
    });

    if (!learningUnit) {
      throw new NotFoundException('Learning unit not found');
    }

    // Strip null bytes that PDF text layers may embed (PostgreSQL rejects 0x00)
    const clean = (s?: string) => s?.replace(/\0/g, '') ?? '';
    const flashcard = await this.prisma.flashcards.create({
      data: {
        userId,
        learningUnitId: dto.learningUnitId,
        chapterId: dto.chapterId,
        question: clean(dto.question),
        answer: clean(dto.answer),
        sourceText: clean(dto.sourceText) || null,
      },
    });

    // Track analytics
    await this.trackAnnotationEvent(userId, 'flashcardCreated', {
      flashcardId: flashcard.id,
      learningUnitId: dto.learningUnitId,
      chapterId: dto.chapterId,
    });

    return flashcard;
  }

  async getFlashcards(userId: string, learningUnitId: string) {
    return this.prisma.flashcards.findMany({
      where: {
        userId,
        learningUnitId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateFlashcard(
    userId: string,
    flashcardId: string,
    dto: { question?: string; answer?: string },
  ) {
    // Verify ownership
    const flashcard = await this.prisma.flashcards.findFirst({
      where: {
        id: flashcardId,
        userId,
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found or unauthorized');
    }

    return this.prisma.flashcards.update({
      where: { id: flashcardId },
      data: dto,
    });
  }

  async markFlashcardReviewed(userId: string, flashcardId: string) {
    // Verify ownership
    const flashcard = await this.prisma.flashcards.findFirst({
      where: {
        id: flashcardId,
        userId,
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found or unauthorized');
    }

    return this.prisma.flashcards.update({
      where: { id: flashcardId },
      data: {
        reviewedAt: new Date(),
      },
    });
  }

  async deleteFlashcard(userId: string, flashcardId: string) {
    // Verify ownership
    const flashcard = await this.prisma.flashcards.findFirst({
      where: {
        id: flashcardId,
        userId,
      },
    });

    if (!flashcard) {
      throw new NotFoundException('Flashcard not found or unauthorized');
    }

    await this.prisma.flashcards.delete({
      where: { id: flashcardId },
    });

    return { success: true };
  }

  // ==================== ANALYTICS ====================

  private async trackAnnotationEvent(
    userId: string,
    eventType: string,
    metadata: any,
  ) {
    try {
      // Log to audit_logs for tracking
      await this.prisma.audit_logs.create({
        data: {
          id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          action: 'EPUB_ANNOTATION' as any,
          entityType: eventType,
          entityId: metadata.learningUnitId,
          description: `User ${eventType}`,
          metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't fail the main operation if analytics fails
      console.error('Failed to track annotation event:', error);
    }
  }

  // ==================== BATCH OPERATIONS ====================

  async getAllAnnotations(userId: string, learningUnitId: string) {
    const [highlights, notes, flashcards] = await Promise.all([
      this.getHighlights(userId, learningUnitId),
      this.getNotes(userId, learningUnitId),
      this.getFlashcards(userId, learningUnitId),
    ]);

    return {
      highlights,
      notes,
      flashcards,
    };
  }

  async getAnnotationStats(userId: string, learningUnitId: string) {
    const [highlightCount, noteCount, flashcardCount, bookmarkCount] = await Promise.all([
      this.prisma.highlights.count({
        where: { userId, learningUnitId },
      }),
      this.prisma.notes.count({
        where: { userId, learningUnitId },
      }),
      this.prisma.flashcards.count({
        where: { userId, learningUnitId },
      }),
      this.prisma.bookmarks.count({
        where: { userId, learningUnitId },
      }),
    ]);

    return {
      highlightCount,
      noteCount,
      flashcardCount,
      bookmarkCount,
      totalAnnotations: highlightCount + noteCount + flashcardCount + bookmarkCount,
    };
  }

  // ==================== BOOKMARKS ====================

  async createBookmark(userId: string, dto: { learningUnitId: string; chapterId: string; pageLabel?: string; note?: string }) {
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: dto.learningUnitId },
    });
    if (!learningUnit) throw new NotFoundException('Learning unit not found');

    // Upsert: if bookmark for same chapter already exists, update it
    const existing = await this.prisma.bookmarks.findUnique({
      where: {
        userId_learningUnitId_chapterId: {
          userId,
          learningUnitId: dto.learningUnitId,
          chapterId: dto.chapterId,
        },
      },
    });

    if (existing) {
      return this.prisma.bookmarks.update({
        where: { id: existing.id },
        data: { pageLabel: dto.pageLabel, note: dto.note },
      });
    }

    return this.prisma.bookmarks.create({
      data: {
        userId,
        learningUnitId: dto.learningUnitId,
        chapterId: dto.chapterId,
        pageLabel: dto.pageLabel,
        note: dto.note,
      },
    });
  }

  async getBookmarks(userId: string, learningUnitId: string) {
    return this.prisma.bookmarks.findMany({
      where: { userId, learningUnitId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteBookmark(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.bookmarks.findFirst({
      where: { id: bookmarkId, userId },
    });
    if (!bookmark) throw new NotFoundException('Bookmark not found or unauthorized');

    await this.prisma.bookmarks.delete({ where: { id: bookmarkId } });
    return { success: true };
  }

  // ==================== FLASHCARD SRS (SM-2 Algorithm) ====================

  async getDueFlashcards(userId: string, learningUnitId: string) {
    return this.prisma.flashcards.findMany({
      where: {
        userId,
        learningUnitId,
        OR: [
          { nextReviewAt: null },
          { nextReviewAt: { lte: new Date() } },
        ],
      },
      orderBy: { nextReviewAt: 'asc' },
    });
  }

  /**
   * SM-2 Spaced Repetition Algorithm
   * quality: 0-5 (0=complete blackout, 5=perfect recall)
   */
  async srsReviewFlashcard(userId: string, flashcardId: string, quality: number) {
    const flashcard = await this.prisma.flashcards.findFirst({
      where: { id: flashcardId, userId },
    });
    if (!flashcard) throw new NotFoundException('Flashcard not found or unauthorized');

    // Clamp quality to 0-5
    quality = Math.max(0, Math.min(5, Math.round(quality)));

    let easeFactor = (flashcard as any).easeFactor || 2.5;
    let interval = (flashcard as any).interval || 0;
    let repetitions = (flashcard as any).repetitions || 0;

    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      // Incorrect — reset
      repetitions = 0;
      interval = 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return this.prisma.flashcards.update({
      where: { id: flashcardId },
      data: {
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastQuality: quality,
        reviewedAt: new Date(),
      },
    });
  }
}
