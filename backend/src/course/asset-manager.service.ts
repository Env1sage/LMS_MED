import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MIME_TO_ASSET_TYPE: Record<string, string> = {
  'application/pdf': 'DOCUMENT',
  'text/plain': 'DOCUMENT',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
  'image/jpeg': 'IMAGE', 'image/png': 'IMAGE', 'image/gif': 'IMAGE', 'image/webp': 'IMAGE',
  'video/mp4': 'VIDEO', 'video/webm': 'VIDEO', 'video/ogg': 'VIDEO', 'video/quicktime': 'VIDEO',
  'audio/mpeg': 'AUDIO', 'audio/wav': 'AUDIO', 'audio/ogg': 'AUDIO', 'audio/mp4': 'AUDIO',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PRESENTATION',
  'application/vnd.ms-powerpoint': 'PRESENTATION',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'SPREADSHEET',
  'application/vnd.ms-excel': 'SPREADSHEET', 'text/csv': 'SPREADSHEET',
  'application/zip': 'ARCHIVE', 'application/x-rar-compressed': 'ARCHIVE',
};

@Injectable()
export class AssetManagerService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'assets');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async upload(
    userId: string,
    collegeId: string | null,
    file: Express.Multer.File,
    opts: { folder?: string; description?: string; isPublic?: boolean },
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${uuidv4()}.${ext}`;
    const subDir = opts.folder || 'general';

    const dir = join(this.uploadDir, subDir);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });

    await writeFile(join(dir, filename), file.buffer);

    const assetType = MIME_TO_ASSET_TYPE[file.mimetype] || 'OTHER';
    const fileUrl = `/uploads/assets/${subDir}/${filename}`;

    return this.prisma.assets.create({
      data: {
        id: uuidv4(),
        uploaderId: userId,
        collegeId: collegeId || null,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        fileUrl,
        type: assetType as any,
        folder: subDir,
        description: opts.description || null,
        isPublic: opts.isPublic || false,
      },
      include: { uploader: { select: { id: true, fullName: true } } },
    });
  }

  async list(
    userId: string,
    role: string,
    collegeId: string | null,
    filters: { type?: string; folder?: string; search?: string },
  ) {
    const where: any = {};

    // Role-based access: admins see all for their college, others see own
    if (role === 'BITFLOW_OWNER') {
      // see all
    } else if (role === 'COLLEGE_ADMIN' && collegeId) {
      where.collegeId = collegeId;
    } else {
      where.uploaderId = userId;
    }

    if (filters.type) where.type = filters.type;
    if (filters.folder) where.folder = filters.folder;
    if (filters.search) {
      where.OR = [
        { originalName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.assets.findMany({
      where,
      include: { uploader: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(userId: string, role: string, collegeId: string | null) {
    const where: any = {};
    if (role === 'BITFLOW_OWNER') {
      // all
    } else if (role === 'COLLEGE_ADMIN' && collegeId) {
      where.collegeId = collegeId;
    } else {
      where.uploaderId = userId;
    }

    const assets = await this.prisma.assets.findMany({ where, select: { size: true, type: true } });
    const totalSize = assets.reduce((s, a) => s + a.size, 0);
    const byType: Record<string, { count: number; size: number }> = {};
    for (const a of assets) {
      if (!byType[a.type]) byType[a.type] = { count: 0, size: 0 };
      byType[a.type].count++;
      byType[a.type].size += a.size;
    }

    return {
      totalFiles: assets.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      byType,
    };
  }

  async findOne(id: string, userId: string, role: string) {
    const asset = await this.prisma.assets.findUnique({
      where: { id },
      include: { uploader: { select: { id: true, fullName: true } } },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    this.checkAccess(asset, userId, role);
    return asset;
  }

  async getSignedUrl(id: string, userId: string, role: string) {
    const asset = await this.prisma.assets.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Public assets or role-based access
    if (!asset.isPublic) this.checkAccess(asset, userId, role);

    // Generate a short-lived token
    const token = this.jwtService.sign(
      { sub: userId, assetId: id },
      { expiresIn: '1h' },
    );

    return {
      url: `${asset.fileUrl}?token=${token}`,
      expiresIn: 3600,
    };
  }

  async remove(id: string, userId: string, role: string) {
    const asset = await this.prisma.assets.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Only uploader or admin can delete
    if (asset.uploaderId !== userId && role !== 'BITFLOW_OWNER' && role !== 'COLLEGE_ADMIN') {
      throw new ForbiddenException('Not authorized to delete this asset');
    }

    // Delete file from disk
    const filePath = join(process.cwd(), asset.fileUrl);
    try { await unlink(filePath); } catch { /* file may not exist */ }

    await this.prisma.assets.delete({ where: { id } });
    return { message: 'Asset deleted' };
  }

  private checkAccess(asset: any, userId: string, role: string) {
    if (role === 'BITFLOW_OWNER') return;
    if (asset.uploaderId === userId) return;
    if (role === 'COLLEGE_ADMIN' && asset.collegeId) return; // Same college checked by guard
    throw new ForbiddenException('Not authorized to access this asset');
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
