import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly maxFileSize = 500 * 1024 * 1024; // 500MB

  async uploadFile(
    file: Express.Multer.File,
    type: 'book' | 'video' | 'note' | 'image' | 'mcq-csv',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds 500MB limit');
    }

    // Validate file type
    const allowedTypes = {
      book: ['application/pdf', 'application/epub+zip'],
      video: ['video/mp4', 'video/webm', 'video/ogg'],
      note: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      'mcq-csv': ['text/csv', 'application/vnd.ms-excel'],
    };

    if (!allowedTypes[type].includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type for ${type}. Allowed: ${allowedTypes[type].join(', ')}`);
    }

    // Ensure upload directory exists
    const typeDir = join(this.uploadDir, type + 's');
    if (!existsSync(typeDir)) {
      await mkdir(typeDir, { recursive: true });
    }

    // Generate unique filename
    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const filepath = join(typeDir, filename);

    // Save file
    await writeFile(filepath, file.buffer);

    // Return relative URL
    return `/uploads/${type}s/${filename}`;
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    type: 'book' | 'video' | 'note' | 'image',
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.uploadFile(file, type);
      urls.push(url);
    }
    return urls;
  }
}
