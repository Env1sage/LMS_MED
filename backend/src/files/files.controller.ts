import { Controller, Get, Param, Res, UseGuards, NotFoundException, Req, Query, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('uploads')
export class FilesController {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Serve uploaded files with authentication
   * GET /api/uploads/:type/:filename?token=xxx
   * Supports both Authorization header and token query parameter
   */
  @Get(':type/:filename')
  async serveFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Query('token') tokenQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Verify authentication - either from header or query parameter
    let isAuthenticated = false;
    
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        await this.jwtService.verifyAsync(token);
        isAuthenticated = true;
      } catch (err) {
        // Token invalid, try query parameter
      }
    }
    
    // If not authenticated via header, try query parameter
    if (!isAuthenticated && tokenQuery) {
      try {
        await this.jwtService.verifyAsync(tokenQuery);
        isAuthenticated = true;
      } catch (err) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
    
    // If still not authenticated, reject
    if (!isAuthenticated) {
      throw new UnauthorizedException('Authentication required');
    }

    // Construct file path from type and filename
    const filePath = `${type}/${filename}`;
    // Construct full file path
    const fullPath = join(process.cwd(), 'uploads', filePath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${filePath}`);
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
