import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EpubService } from './epub.service';

@Controller('offline')
@UseGuards(JwtAuthGuard)
export class OfflineController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly epubService: EpubService,
  ) {}

  // Request offline download for a learning unit
  @Post('download/:learningUnitId')
  async requestOfflineDownload(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Body() body: { deviceId: string },
  ) {
    try {
      const userId = req.user.userId;
      const { deviceId } = body;

      // Verify learning unit exists and is EPUB
      const learningUnit = await this.prisma.learning_units.findUnique({
        where: { id: learningUnitId },
      });

      if (!learningUnit) {
        throw new HttpException('Learning unit not found', HttpStatus.NOT_FOUND);
      }

      if (learningUnit.fileFormat !== 'EPUB') {
        throw new HttpException(
          'Only EPUB content supports offline mode',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!learningUnit.isOfflineEnabled) {
        throw new HttpException(
          'Offline access not enabled for this content',
          HttpStatus.FORBIDDEN,
        );
      }

      // Get user with college
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          colleges: true,
        },
      });

      if (!user || !user.collegeId) {
        throw new HttpException('User not found or not associated with a college', HttpStatus.NOT_FOUND);
      }

      // Get institution policy for the college
      let policy = await this.prisma.institution_policies.findUnique({
        where: { collegeId: user.collegeId },
      });

      // If no policy exists, create default policy
      if (!policy) {
        policy = await this.prisma.institution_policies.create({
          data: {
            collegeId: user.collegeId,
            offlineDurationDays: 7,
            offlineMaxDevices: 2,
            allowOfflineDownload: true,
          },
        });
      }

      // Check if offline download is allowed by institution policy
      if (!policy.allowOfflineDownload) {
        throw new HttpException(
          'Offline downloads are disabled by your institution',
          HttpStatus.FORBIDDEN,
        );
      }

      // Check device limit
      const activeDevices = await this.prisma.offline_downloads.count({
        where: {
          userId,
          learningUnitId,
          revoked: false,
          expiresAt: {
            gte: new Date(),
          },
        },
      });

      const existingDownload = await this.prisma.offline_downloads.findFirst({
        where: {
          userId,
          learningUnitId,
          deviceId,
        },
      });

      // If this is a new device and we've reached the limit, deny
      if (!existingDownload && activeDevices >= policy.offlineMaxDevices) {
        throw new HttpException(
          `Maximum ${policy.offlineMaxDevices} devices allowed for offline access. Please revoke access from another device.`,
          HttpStatus.FORBIDDEN,
        );
      }

      // Calculate expiry based on institution policy
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + policy.offlineDurationDays);

      let offlineDownload;
      if (existingDownload) {
        // Update expiry
        offlineDownload = await this.prisma.offline_downloads.update({
          where: { id: existingDownload.id },
          data: {
            expiresAt,
            revoked: false,
          },
        });
      } else {
        // Create new
        offlineDownload = await this.prisma.offline_downloads.create({
          data: {
            userId,
            learningUnitId,
            deviceId,
            expiresAt,
          },
        });
      }

      // Get all chapters for this learning unit
      const chapters = await this.prisma.epub_chapters.findMany({
        where: { learningUnitId },
        orderBy: { chapterOrder: 'asc' },
      });

      // Return book metadata and chapter list
      return {
        success: true,
        offlineDownloadId: offlineDownload.id,
        expiresAt: offlineDownload.expiresAt,
        policy: {
          durationDays: policy.offlineDurationDays,
          maxDevices: policy.offlineMaxDevices,
          activeDevices: existingDownload ? activeDevices : activeDevices + 1,
        },
        learningUnit: {
          id: learningUnit.id,
          title: learningUnit.title,
          chapterCount: chapters.length,
        },
        chapters: chapters.map((ch) => ({
          id: ch.id,
          chapterTitle: ch.chapterTitle,
          chapterOrder: ch.chapterOrder,
          checksum: ch.checksum,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to request offline download:', error);
      throw new HttpException(
        'Failed to process offline download request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Validate offline access
  @Post('validate')
  async validateOfflineAccess(
    @Request() req: any,
    @Body()
    body: {
      learningUnitId: string;
      deviceId: string;
    },
  ) {
    try {
      const userId = req.user.userId;
      const { learningUnitId, deviceId } = body;

      const offlineDownload = await this.prisma.offline_downloads.findFirst({
        where: {
          userId,
          learningUnitId,
          deviceId,
        },
      });

      if (!offlineDownload) {
        return {
          valid: false,
          reason: 'No offline download found',
        };
      }

      if (offlineDownload.revoked) {
        return {
          valid: false,
          reason: 'Offline access has been revoked',
        };
      }

      const now = new Date();
      if (offlineDownload.expiresAt < now) {
        return {
          valid: false,
          reason: 'Offline access has expired',
          expiresAt: offlineDownload.expiresAt,
        };
      }

      return {
        valid: true,
        expiresAt: offlineDownload.expiresAt,
      };
    } catch (error) {
      console.error('Failed to validate offline access:', error);
      throw new HttpException(
        'Failed to validate offline access',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Revoke offline access (admin or self)
  @Delete('revoke/:learningUnitId')
  async revokeOfflineAccess(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
    @Body() body?: { deviceId?: string },
  ) {
    try {
      const userId = req.user.userId;
      const deviceId = body?.deviceId;

      const where: any = {
        userId,
        learningUnitId,
      };

      if (deviceId) {
        where.deviceId = deviceId;
      }

      // Mark as revoked
      const result = await this.prisma.offline_downloads.updateMany({
        where,
        data: {
          revoked: true,
        },
      });

      return {
        success: true,
        revokedCount: result.count,
      };
    } catch (error) {
      console.error('Failed to revoke offline access:', error);
      throw new HttpException(
        'Failed to revoke offline access',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get user's offline downloads
  @Get('downloads')
  async getUserOfflineDownloads(@Request() req: any) {
    try {
      const userId = req.user.userId;

      const downloads = await this.prisma.offline_downloads.findMany({
        where: { userId },
        include: {
          learningUnit: {
            select: {
              id: true,
              title: true,
              chapterCount: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return downloads.map((download) => ({
        id: download.id,
        learningUnitId: download.learningUnitId,
        learningUnit: download.learningUnit,
        deviceId: download.deviceId,
        expiresAt: download.expiresAt,
        revoked: download.revoked,
        createdAt: download.createdAt,
        isExpired: download.expiresAt < new Date(),
      }));
    } catch (error) {
      console.error('Failed to get offline downloads:', error);
      throw new HttpException(
        'Failed to fetch offline downloads',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get offline stats for admin
  @Get('stats')
  async getOfflineStats(@Request() req: any) {
    try {
      // Only allow admin roles
      if (req.user.role !== 'BITFLOW_OWNER' && req.user.role !== 'COLLEGE_ADMIN') {
        throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
      }

      const totalDownloads = await this.prisma.offline_downloads.count();
      const activeDownloads = await this.prisma.offline_downloads.count({
        where: {
          revoked: false,
          expiresAt: {
            gte: new Date(),
          },
        },
      });
      const revokedDownloads = await this.prisma.offline_downloads.count({
        where: { revoked: true },
      });
      const expiredDownloads = await this.prisma.offline_downloads.count({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      return {
        totalDownloads,
        activeDownloads,
        revokedDownloads,
        expiredDownloads,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to get offline stats:', error);
      throw new HttpException(
        'Failed to fetch offline stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get institution policy (college admin)
  @Get('policy')
  async getInstitutionPolicy(@Request() req: any) {
    try {
      // Use collegeId from JWT if available, otherwise look up user
      const collegeId = req.user.collegeId;

      if (!collegeId) {
        throw new HttpException('User not associated with a college', HttpStatus.NOT_FOUND);
      }

      // Get or create policy
      let policy = await this.prisma.institution_policies.findUnique({
        where: { collegeId },
      });

      if (!policy) {
        policy = await this.prisma.institution_policies.create({
          data: {
            collegeId,
            offlineDurationDays: 7,
            offlineMaxDevices: 2,
            allowOfflineDownload: true,
          },
        });
      }

      return policy;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to get institution policy:', error);
      throw new HttpException(
        'Failed to fetch institution policy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Update institution policy (college admin only)
  @Post('policy')
  async updateInstitutionPolicy(
    @Request() req: any,
    @Body()
    body: {
      offlineDurationDays?: number;
      offlineMaxDevices?: number;
      allowOfflineDownload?: boolean;
    },
  ) {
    try {
      // Only allow college admin
      if (req.user.role !== 'COLLEGE_ADMIN' && req.user.role !== 'BITFLOW_OWNER') {
        throw new HttpException('Only college administrators can update offline policies', HttpStatus.FORBIDDEN);
      }

      const collegeId = req.user.collegeId;

      if (!collegeId) {
        throw new HttpException('User not associated with a college', HttpStatus.NOT_FOUND);
      }

      // Validate input
      if (body.offlineDurationDays !== undefined && (body.offlineDurationDays < 1 || body.offlineDurationDays > 365)) {
        throw new HttpException('Offline duration must be between 1 and 365 days', HttpStatus.BAD_REQUEST);
      }

      if (body.offlineMaxDevices !== undefined && (body.offlineMaxDevices < 1 || body.offlineMaxDevices > 10)) {
        throw new HttpException('Max devices must be between 1 and 10', HttpStatus.BAD_REQUEST);
      }

      // Get or create policy
      let policy = await this.prisma.institution_policies.findUnique({
        where: { collegeId },
      });

      if (!policy) {
        policy = await this.prisma.institution_policies.create({
          data: {
            collegeId,
            offlineDurationDays: body.offlineDurationDays ?? 7,
            offlineMaxDevices: body.offlineMaxDevices ?? 2,
            allowOfflineDownload: body.allowOfflineDownload ?? true,
          },
        });
      } else {
        policy = await this.prisma.institution_policies.update({
          where: { id: policy.id },
          data: {
            ...(body.offlineDurationDays !== undefined && { offlineDurationDays: body.offlineDurationDays }),
            ...(body.offlineMaxDevices !== undefined && { offlineMaxDevices: body.offlineMaxDevices }),
            ...(body.allowOfflineDownload !== undefined && { allowOfflineDownload: body.allowOfflineDownload }),
          },
        });
      }

      return {
        success: true,
        policy,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to update institution policy:', error);
      throw new HttpException(
        'Failed to update institution policy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Get active devices for a learning unit (for admin or user)
  @Get('devices/:learningUnitId')
  async getActiveDevices(
    @Request() req: any,
    @Param('learningUnitId') learningUnitId: string,
  ) {
    try {
      const userId = req.user.userId;

      const devices = await this.prisma.offline_downloads.findMany({
        where: {
          userId,
          learningUnitId,
          revoked: false,
          expiresAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return devices.map((device) => ({
        id: device.id,
        deviceId: device.deviceId,
        expiresAt: device.expiresAt,
        createdAt: device.createdAt,
      }));
    } catch (error) {
      console.error('Failed to get active devices:', error);
      throw new HttpException(
        'Failed to fetch active devices',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Revoke specific device (for user to manage their devices)
  @Delete('device/:downloadId')
  async revokeDevice(
    @Request() req: any,
    @Param('downloadId') downloadId: string,
  ) {
    try {
      const userId = req.user.userId;

      // Find the download
      const download = await this.prisma.offline_downloads.findUnique({
        where: { id: downloadId },
      });

      if (!download) {
        throw new HttpException('Download not found', HttpStatus.NOT_FOUND);
      }

      // Ensure user owns this download (or is admin)
      if (download.userId !== userId && req.user.role !== 'COLLEGE_ADMIN' && req.user.role !== 'BITFLOW_OWNER') {
        throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
      }

      // Revoke
      await this.prisma.offline_downloads.update({
        where: { id: downloadId },
        data: { revoked: true },
      });

      return {
        success: true,
        message: 'Device access revoked',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Failed to revoke device:', error);
      throw new HttpException(
        'Failed to revoke device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
