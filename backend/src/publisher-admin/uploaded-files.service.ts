import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class UploadedFilesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    publisherId: string;
    fileName: string;
    originalName: string;
    fileUrl: string;
    fileCategory: string;
    fileSize: number;
    mimeType: string;
  }) {
    return this.prisma.publisher_uploaded_files.create({ data });
  }

  async findAll(publisherId: string) {
    return this.prisma.publisher_uploaded_files.findMany({
      where: { publisherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, publisherId: string) {
    const file = await this.prisma.publisher_uploaded_files.findFirst({
      where: { id, publisherId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Delete physical file if it exists
    if (file.fileUrl) {
      const filePath = join(process.cwd(), file.fileUrl);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {});
      }
    }

    return this.prisma.publisher_uploaded_files.delete({ where: { id } });
  }
}
