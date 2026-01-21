import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../common/enums';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   * Only accessible by Bitflow Owner or College Admin
   */
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BITFLOW_OWNER, UserRole.COLLEGE_ADMIN)
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const requestContext = {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.authService.register(dto, requestContext);
  }

  /**
   * Login endpoint
   * Public - validates credentials server-side
   */
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const requestContext = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    return this.authService.login(dto, requestContext);
  }

  /**
   * Refresh access token
   * Public - validates refresh token server-side
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  /**
   * Logout
   * Protected - requires valid JWT
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    await this.authService.logout(user.userId, dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Change password
   * Protected - requires valid JWT
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.userId, dto);
    return { message: 'Password changed successfully' };
  }

  /**
   * Get current user profile
   * Protected - requires valid JWT
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
      publisherId: user.publisherId,
    };
  }
}
