import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Logger,
  Query,
  Headers,
  NotFoundException,
} from '@nestjs/common';
import { EpubService } from './epub.service';
import { WatermarkService } from './watermark.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('epub')
export class EpubController {
  private readonly logger = new Logger(EpubController.name);

  constructor(
    private readonly epubService: EpubService,
    private readonly watermarkService: WatermarkService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get list of chapters for a learning unit
   * Requires valid access token (query param) or Authorization header
   */
  @Get('chapters/:learningUnitId')
  async getChaptersList(
    @Param('learningUnitId') learningUnitId: string,
    @Query('token') token: string,
    @Headers('authorization') authHeader: string,
  ) {
    // Try content access token first, then fall back to auth JWT
    let userId: string | undefined;
    let tokenValid = false;
    
    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        userId = decoded.userId;
        const tokenLearningUnitId = decoded.learningUnitId;

        if (tokenLearningUnitId && tokenLearningUnitId !== learningUnitId) {
          throw new UnauthorizedException('Token does not match this learning unit');
        }
        tokenValid = true;
      } catch (error) {
        this.logger.warn(`Content token verification failed: ${error instanceof Error ? error.message : String(error)}`);
        // Fall through to try auth header
      }
    }
    
    if (!tokenValid && authHeader) {
      try {
        const bearerToken = authHeader.replace('Bearer ', '');
        const decoded = this.jwtService.verify(bearerToken);
        userId = decoded.sub || decoded.userId;
      } catch (error) {
        this.logger.warn(`Auth header verification failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      await this.verifyUserAccess(userId, learningUnitId);
      return await this.epubService.getChaptersList(learningUnitId);
    } catch (error) {
      this.logger.error(`Failed to get chapters list: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Failed to load chapters');
    }
  }

  /**
   * Get specific chapter content with watermarking
   * Requires valid access token and device ID
   */
  @Get('chapter/:chapterId')
  async getChapterContent(
    @Param('chapterId') chapterId: string,
    @Query('token') token: string,
    @Query('learningUnitId') learningUnitId: string,
    @Headers('x-device-id') deviceId: string,
    @Headers('authorization') authHeader: string,
  ) {
    // Resolve userId from content token or auth header
    let userId: string | undefined;
    let tokenValid = false;
    
    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        userId = decoded.userId;
        const tokenLearningUnitId = decoded.learningUnitId;
        if (tokenLearningUnitId && tokenLearningUnitId !== learningUnitId) {
          throw new UnauthorizedException('Token does not match this learning unit');
        }
        tokenValid = true;
      } catch (error) {
        this.logger.warn(`Content token verification failed for chapter: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!tokenValid && authHeader) {
      try {
        const bearerToken = authHeader.replace('Bearer ', '');
        const decoded = this.jwtService.verify(bearerToken);
        userId = decoded.sub || decoded.userId;
      } catch (error) {
        this.logger.warn(`Auth header verification failed for chapter: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    try {
      // Verify user has access
      await this.verifyUserAccess(userId, learningUnitId);

      // Get or create watermark session
      const watermarkSession = await this.watermarkService.getOrCreateSession(
        userId,
        deviceId || 'unknown',
        learningUnitId,
        chapterId,
      );

      // Get user details for watermark
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          students: { include: { college: true } },
        },
      });

      const userName = user?.fullName || 'User';
      const userRole = user?.role || 'STUDENT';
      const userEmail = user?.email || '';
      const studentId = (user as any)?.students?.enrollmentNumber || userId.substring(0, 8);
      
      // Get college/institution name
      let institution = 'Medical Institution';
      if (user?.students?.college?.name) {
        institution = user.students.college.name;
      } else if (user?.collegeId) {
        const college = await this.prisma.colleges.findUnique({
          where: { id: user.collegeId },
          select: { name: true },
        });
        institution = college?.name || institution;
      }

      // Generate watermark text with full details
      const watermarkText = this.watermarkService.generateWatermarkText(
        userName,
        userRole,
        institution,
        watermarkSession.sessionSeed,
      );

      // Enhanced watermark with email, student ID, timestamp, IP
      const enhancedWatermarkText = `${userName} | ${userEmail} | ${studentId} | ${institution} | ${new Date().toLocaleString()}`;

      // Get watermark style randomization
      const watermarkStyle = this.watermarkService.generateWatermarkStyle();

      // Generate forensic markers
      const forensicMarkers = this.watermarkService.generateForensicMarkers(
        watermarkSession.sessionSeed,
        watermarkSession.forensicHash,
      );

      // Log chapter access
      await this.logChapterAccess(userId, learningUnitId, chapterId, deviceId);

      // Get chapter content
      const chapterData = await this.epubService.getChapterContent(
        chapterId,
        learningUnitId,
      );

      // Inject forensic markers into content
      const watermarkedContent = this.watermarkService.injectForensicMarkers(
        chapterData.content,
        forensicMarkers,
      );

      return {
        ...chapterData,
        content: watermarkedContent,
        watermark: {
          text: enhancedWatermarkText,
          style: watermarkStyle,
          forensicHash: watermarkSession.forensicHash,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get chapter content: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Failed to load chapter content');
    }
  }

  /**
   * Get PDF metadata (page count) without sending the full file
   * GET /api/epub/pdf/:learningUnitId/info
   */
  @Get('pdf/:learningUnitId/info')
  async getPdfInfo(
    @Param('learningUnitId') learningUnitId: string,
    @Query('token') token: string,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.resolveUserId(token, authHeader);
    await this.verifyUserAccess(userId, learningUnitId);
    return this.epubService.getPdfInfo(learningUnitId);
  }

  /**
   * Serve a single PDF page (extracted as a 1-page PDF)
   * GET /api/epub/pdf/:learningUnitId/page/:pageNum
   */
  @Get('pdf/:learningUnitId/page/:pageNum')
  async servePdfPage(
    @Param('learningUnitId') learningUnitId: string,
    @Param('pageNum') pageNum: string,
    @Query('token') token: string,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    const userId = this.resolveUserId(token, authHeader);
    await this.verifyUserAccess(userId, learningUnitId);

    const page = parseInt(pageNum, 10);
    if (isNaN(page) || page < 1) {
      throw new NotFoundException('Invalid page number');
    }

    const pageBuffer = await this.epubService.getPdfPage(learningUnitId, page);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pageBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300'); // cache 5 min on client
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(pageBuffer);
  }

  /**
   * Return the PDF's built-in outline (bookmarks) as JSON.
   * Returns [] if the PDF has no outline or extraction fails.
   * GET /api/epub/pdf/:learningUnitId/outline
   */
  @Get('pdf/:learningUnitId/outline')
  async getPdfOutline(
    @Param('learningUnitId') learningUnitId: string,
    @Query('token') token: string,
    @Headers('authorization') authHeader: string,
  ) {
    const userId = this.resolveUserId(token, authHeader);
    await this.verifyUserAccess(userId, learningUnitId);
    const outline = await this.epubService.getPdfOutline(learningUnitId);
    return { outline };
  }

  /**
   * DISABLED: Full PDF download is not allowed for security.
   * Use page-by-page endpoint /pdf/:learningUnitId/page/:pageNum instead.
   * GET /api/epub/pdf/:learningUnitId
   */
  @Get('pdf/:learningUnitId')
  async servePdf(
    @Param('learningUnitId') learningUnitId: string,
    @Res() res: Response,
  ) {
    return res.status(403).json({
      statusCode: 403,
      message: 'Full PDF download is disabled for security. Content is served page-by-page only.',
    });
  }

  /**
   * Resolve userId from content token or auth header
   */
  private resolveUserId(token?: string, authHeader?: string): string {
    let userId: string | undefined;

    if (token) {
      try {
        const decoded = this.jwtService.verify(token);
        userId = decoded.userId || decoded.sub;
      } catch (error) {
        this.logger.warn(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!userId && authHeader) {
      try {
        const bearerToken = authHeader.replace('Bearer ', '');
        const decoded = this.jwtService.verify(bearerToken);
        userId = decoded.sub || decoded.userId;
      } catch (error) {
        this.logger.warn(`Auth header verification failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return userId;
  }

  /**
   * Verify user has access to learning unit
   * Checks: user exists, content active, tenant isolation, enrollment
   */
  private async verifyUserAccess(
    userId: string,
    learningUnitId: string,
  ): Promise<boolean> {
    const learningUnit = await this.prisma.learning_units.findUnique({
      where: { id: learningUnitId },
      include: {
        publishers: true,
      },
    });

    if (!learningUnit) {
      throw new UnauthorizedException('Content not found');
    }

    // Verify user exists
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        students: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    // Bitflow Owner and Publisher Admins bypass enrollment AND status checks
    if (user.role === 'BITFLOW_OWNER' || user.role === 'PUBLISHER_ADMIN') {
      return true;
    }

    if (learningUnit.status !== 'ACTIVE') {
      throw new UnauthorizedException('Content is not available');
    }

    // College Admin, Dean, HOD, and Faculty — must belong to a college that has a course using this content
    if (user.role === 'COLLEGE_ADMIN' || user.role === 'FACULTY' || user.role === 'COLLEGE_DEAN' || user.role === 'COLLEGE_HOD') {
      if (!user.collegeId) {
        throw new UnauthorizedException('User not associated with any institution');
      }
      // Check if any course in their college references this learning unit
      const courseWithUnit = await this.prisma.learning_flow_steps.findFirst({
        where: {
          learningUnitId,
          courses: {
            collegeId: user.collegeId,
          },
        },
      });
      if (!courseWithUnit) {
        throw new UnauthorizedException('Content not available for your institution');
      }
      return true;
    }

    // Students — must be enrolled in a course that contains this learning unit
    if (user.role === 'STUDENT' && user.students) {
      const enrollment = await this.prisma.course_assignments.findFirst({
        where: {
          studentId: user.students.id,
          courses: {
            collegeId: user.students.collegeId,
            learning_flow_steps: {
              some: {
                learningUnitId,
              },
            },
          },
        },
      });
      if (!enrollment) {
        throw new UnauthorizedException('You are not enrolled in a course with this content');
      }
      return true;
    }

    throw new UnauthorizedException('Access denied');
  }

  /**
   * Log chapter access for analytics
   */
  private async logChapterAccess(
    userId: string,
    learningUnitId: string,
    chapterId: string,
    deviceId?: string,
  ): Promise<void> {
    try {
      // Update or create access log
      const existingLog = await this.prisma.learning_unit_access_logs.findFirst({
        where: {
          userId,
          learningUnitId,
          sessionEnded: null,
        },
        orderBy: { sessionStarted: 'desc' },
      });

      if (existingLog) {
        // Update existing log with chapter access
        await this.prisma.learning_unit_access_logs.update({
          where: { id: existingLog.id },
          data: { 
            chapterId,
            deviceId: deviceId || existingLog.deviceId,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to log chapter access: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - logging failure shouldn't block content access
    }
  }
}
