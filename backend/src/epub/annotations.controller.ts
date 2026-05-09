import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnnotationsService } from './annotations.service';

@Controller('annotations')
@UseGuards(JwtAuthGuard)
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  // ==================== HIGHLIGHTS ====================

  @Post('highlights')
  async createHighlight(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.createHighlight(userId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create highlight',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('highlights/:learningUnitId')
  async getHighlights(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Query('chapterId') chapterId?: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getHighlights(
        userId,
        learningUnitId,
        chapterId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch highlights',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('highlights/:highlightId')
  async updateHighlight(
    @Request() req: any,
    @Param('highlightId') highlightId: string,
    @Body() body: any,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.updateHighlight(
        userId,
        highlightId,
        body,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update highlight',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('highlights/:highlightId')
  async deleteHighlight(
    @Request() req: any,
    @Param('highlightId') highlightId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.deleteHighlight(userId, highlightId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete highlight',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== NOTES ====================

  @Post('notes')
  async createNote(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.createNote(userId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create note',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('notes/:learningUnitId')
  async getNotes(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Query('chapterId') chapterId?: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getNotes(
        userId,
        learningUnitId,
        chapterId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch notes',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('notes/:noteId')
  async updateNote(
    @Request() req: any,
    @Param('noteId') noteId: string,
    @Body() body: any,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.updateNote(userId, noteId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update note',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('notes/:noteId')
  async deleteNote(@Request() req: any, @Param('noteId') noteId: string) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.deleteNote(userId, noteId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete note',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== FLASHCARDS ====================

  @Post('flashcards')
  async createFlashcard(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.createFlashcard(userId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create flashcard',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('flashcards/:learningUnitId')
  async getFlashcards(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getFlashcards(userId, learningUnitId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch flashcards',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('flashcards/:flashcardId')
  async updateFlashcard(
    @Request() req: any,
    @Param('flashcardId') flashcardId: string,
    @Body() body: any,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.updateFlashcard(
        userId,
        flashcardId,
        body,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update flashcard',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('flashcards/:flashcardId/review')
  async markFlashcardReviewed(
    @Request() req: any,
    @Param('flashcardId') flashcardId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.markFlashcardReviewed(
        userId,
        flashcardId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to mark flashcard as reviewed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('flashcards/:flashcardId')
  async deleteFlashcard(
    @Request() req: any,
    @Param('flashcardId') flashcardId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.deleteFlashcard(userId, flashcardId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete flashcard',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== BATCH OPERATIONS ====================

  @Get('all/:learningUnitId')
  async getAllAnnotations(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getAllAnnotations(
        userId,
        learningUnitId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch annotations',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('stats/:learningUnitId')
  async getAnnotationStats(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getAnnotationStats(
        userId,
        learningUnitId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch annotation stats',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== BOOKMARKS ====================

  @Post('bookmarks')
  async createBookmark(@Request() req: any, @Body() body: any) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.createBookmark(userId, body);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create bookmark',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('bookmarks/:learningUnitId')
  async getBookmarks(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getBookmarks(userId, learningUnitId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch bookmarks',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('bookmarks/:bookmarkId')
  async deleteBookmark(
    @Request() req: any,
    @Param('bookmarkId') bookmarkId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.deleteBookmark(userId, bookmarkId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete bookmark',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== FLASHCARD SRS REVIEW ====================

  @Get('flashcards/:learningUnitId/due')
  async getDueFlashcards(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.getDueFlashcards(userId, learningUnitId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch due flashcards',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('flashcards/:flashcardId/srs-review')
  async srsReviewFlashcard(
    @Request() req: any,
    @Param('flashcardId') flashcardId: string,
    @Body() body: { quality: number },
  ) {
    try {
      const userId = req.user.userId;
      return await this.annotationsService.srsReviewFlashcard(
        userId,
        flashcardId,
        body.quality,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to review flashcard',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
