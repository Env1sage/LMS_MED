import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);
  private readonly watermarkSecret = process.env.WATERMARK_SECRET || 'medical-lms-watermark-key';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate forensic watermark session
   * Creates unique session with forensic hash and seed
   */
  async generateWatermarkSession(
    userId: string,
    deviceId: string,
    learningUnitId: string,
    chapterId: string,
  ) {
    // Generate forensic hash
    const forensicHash = this.generateForensicHash(
      userId,
      deviceId,
      learningUnitId,
      chapterId,
    );

    // Generate random session seed (16-byte hex)
    const sessionSeed = crypto.randomBytes(16).toString('hex');

    // Save to database
    const session = await this.prisma.watermark_sessions.create({
      data: {
        userId,
        deviceId,
        learningUnitId,
        chapterId,
        forensicHash,
        sessionSeed,
      },
    });

    this.logger.log(
      `Created watermark session for user ${userId}, chapter ${chapterId}`,
    );

    return session;
  }

  /**
   * Generate forensic hash for session tracking
   * SHA-256 of combined unique identifiers
   */
  private generateForensicHash(
    userId: string,
    deviceId: string,
    learningUnitId: string,
    chapterId: string,
  ): string {
    const timestamp = Date.now().toString();
    const dataToHash = `${userId}${deviceId}${learningUnitId}${chapterId}${timestamp}${this.watermarkSecret}`;

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Generate visible watermark text with session randomization
   */
  generateWatermarkText(
    userName: string,
    userRole: string,
    institution: string,
    sessionSeed: string,
  ): string {
    // Extract first 6 chars of session seed for display
    const sessionCode = sessionSeed.substring(0, 6).toUpperCase();

    return `Bitflow Medical LMS | ${userName} | ${userRole} | ${institution} | Session:${sessionCode} | Confidential`;
  }

  /**
   * Generate invisible forensic markers
   * Returns HTML markers to be injected into content
   */
  generateForensicMarkers(sessionSeed: string, forensicHash: string): string[] {
    const markers: string[] = [];

    // Generate 10 distributed markers
    for (let i = 0; i < 10; i++) {
      const markerKey = crypto
        .createHash('md5')
        .update(`${sessionSeed}${forensicHash}${i}`)
        .digest('hex')
        .substring(0, 8);

      markers.push(
        `<span class="bf-f" data-k="${markerKey}" style="display:none;font-size:0;"></span>`,
      );
    }

    return markers;
  }

  /**
   * Inject forensic markers into HTML content
   * Distributes markers throughout the content
   */
  injectForensicMarkers(htmlContent: string, markers: string[]): string {
    // Split content by paragraph tags
    const paragraphs = htmlContent.split('</p>');

    if (paragraphs.length < markers.length) {
      // If not enough paragraphs, just append markers
      return htmlContent + markers.join('');
    }

    // Distribute markers evenly
    const interval = Math.floor(paragraphs.length / markers.length);
    let markerIndex = 0;

    const injectedContent = paragraphs
      .map((para, index) => {
        if (markerIndex < markers.length && index % interval === 0) {
          return para + '</p>' + markers[markerIndex++];
        }
        return para + (index < paragraphs.length - 1 ? '</p>' : '');
      })
      .join('');

    return injectedContent;
  }

  /**
   * Generate watermark styling with randomization
   */
  generateWatermarkStyle(): {
    rotation: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  } {
    return {
      rotation: -28 + Math.random() * 4, // -28° to -32°
      offsetX: Math.floor(Math.random() * 20) - 10, // -10px to +10px
      offsetY: Math.floor(Math.random() * 20) - 10,
      opacity: 0.12 + Math.random() * 0.03, // 0.12 to 0.15
    };
  }

  /**
   * Verify forensic hash matches session
   */
  async verifyForensicHash(
    forensicHash: string,
  ): Promise<{ valid: boolean; session?: any }> {
    const session = await this.prisma.watermark_sessions.findFirst({
      where: { forensicHash },
    });

    return {
      valid: !!session,
      session,
    };
  }

  /**
   * Get or create watermark session (with caching logic)
   * Reuses existing session within TTL (5 minutes)
   */
  async getOrCreateSession(
    userId: string,
    deviceId: string,
    learningUnitId: string,
    chapterId: string,
  ) {
    // Check for recent session (within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const existingSession = await this.prisma.watermark_sessions.findFirst({
      where: {
        userId,
        deviceId,
        learningUnitId,
        chapterId,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existingSession) {
      this.logger.log(`Reusing existing watermark session for user ${userId}`);
      return existingSession;
    }

    // Create new session
    return this.generateWatermarkSession(
      userId,
      deviceId,
      learningUnitId,
      chapterId,
    );
  }
}
