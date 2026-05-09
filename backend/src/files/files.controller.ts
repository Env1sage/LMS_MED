import { Controller, Get, Param, Res, NotFoundException, Req, UnauthorizedException, BadRequestException, Query } from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

@Controller('uploads')
export class FilesController {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Public endpoint: serve cover image by ISBN/code, any extension
   * GET /api/uploads/cover/:isbn
   * Tries .jpg, .png, .webp, .gif — returns first match. No auth needed (cover thumbnails are public).
   */
  @Get('cover/:isbn')
  async serveCoverImage(
    @Param('isbn') isbn: string,
    @Res() res: Response,
  ) {
    // Sanitize
    if (!/^[a-zA-Z0-9._\-]+$/.test(isbn) || isbn.includes('..')) {
      throw new BadRequestException('Invalid ISBN/code');
    }

    const imagesDir = join(process.cwd(), 'uploads', 'images');
    const exts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    };

    // Try exact extension matches first
    for (const ext of exts) {
      const fullPath = join(imagesDir, `${isbn}.${ext}`);
      if (existsSync(fullPath)) {
        res.setHeader('Content-Type', contentTypes[ext]);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(fullPath);
      }
    }

    // Fallback: scan directory for any file starting with isbn
    if (existsSync(imagesDir)) {
      const files = readdirSync(imagesDir);
      const match = files.find(f => f.startsWith(isbn + '.'));
      if (match) {
        const ext = match.split('.').pop()?.toLowerCase() || '';
        const fullPath = join(imagesDir, match);
        res.setHeader('Content-Type', contentTypes[ext] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.sendFile(fullPath);
      }
    }

    throw new NotFoundException('Cover image not found');
  }

  /**
   * Serve uploaded files with authentication
   * GET /api/uploads/:type/:filename
   * Requires Authorization: Bearer <token> header
   */
  @Get(':type/:filename')
  async serveFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Query('token') queryToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify authentication from Authorization header OR query param token
    // (query param token is accepted for video/audio to support HTML5 media elements
    //  which cannot set custom request headers)
    let isAuthenticated = false;
    
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        await this.jwtService.verifyAsync(token);
        isAuthenticated = true;
      } catch (err) {
        // Token invalid
      }
    }

    // Fallback: query param token (required for HTML5 <video> / <audio> elements)
    if (!isAuthenticated && queryToken) {
      try {
        await this.jwtService.verifyAsync(queryToken);
        isAuthenticated = true;
      } catch (err) {
        // Token invalid
      }
    }
    
    // If not authenticated, reject
    if (!isAuthenticated) {
      throw new UnauthorizedException('Authentication required');
    }

    // Sanitize path components to prevent path traversal attacks
    const safeFilenamePattern = /^[a-zA-Z0-9._\-]+$/;
    const safeTypePattern = /^[a-zA-Z0-9_\-]+$/;
    if (!safeFilenamePattern.test(filename) || filename.includes('..')) {
      throw new BadRequestException('Invalid filename');
    }
    if (!safeTypePattern.test(type) || type.includes('..')) {
      throw new BadRequestException('Invalid file type');
    }

    // Construct file path from type and filename
    const filePath = `${type}/${filename}`;
    // Construct full file path
    const uploadsRoot = join(process.cwd(), 'uploads');
    const fullPath = join(uploadsRoot, type, filename);

    // Double-check resolved path stays within uploads directory (defence-in-depth)
    if (!fullPath.startsWith(uploadsRoot + '/') && fullPath !== uploadsRoot) {
      throw new BadRequestException('Invalid file path');
    }

    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    // Set appropriate content type based on file extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      zip: 'application/zip',
      html: 'text/html',
      htm: 'text/html',
    };

    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Send file
    res.sendFile(fullPath);
  }
}
