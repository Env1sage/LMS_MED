import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
}

@Injectable()
export class LearningSecurityService {
  // In-memory session store (in production, use Redis)
  private activeSessions = new Map<string, SessionInfo>();
  private userSessionCount = new Map<string, number>();
  private readonly MAX_CONCURRENT_SESSIONS = 2;

  constructor(private prisma: PrismaService) {}

  /**
   * Create a learning session with device binding
   */
  async createLearningSession(
    userId: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ sessionId: string; token: string }> {
    // Check concurrent session limit
    const currentSessions = this.userSessionCount.get(userId) || 0;
    
    if (currentSessions >= this.MAX_CONCURRENT_SESSIONS) {
      // Log potential credential sharing
      await this.logSecurityEvent(userId, 'CONCURRENT_SESSION_LIMIT', {
        attemptedDeviceFingerprint: deviceFingerprint,
        ipAddress,
        currentSessions,
      });
      
      throw new ForbiddenException(
        'Maximum concurrent sessions reached. Please log out from another device.',
      );
    }

    const sessionId = uuidv4();
    const token = this.generateSecureToken(sessionId, userId, deviceFingerprint);

    const session: SessionInfo = {
      sessionId,
      userId,
      deviceFingerprint,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.activeSessions.set(sessionId, session);
    this.userSessionCount.set(userId, currentSessions + 1);

    // Log session creation
    await this.logSecurityEvent(userId, 'SESSION_CREATED', {
      sessionId,
      deviceFingerprint,
      ipAddress,
    });

    return { sessionId, token };
  }

  /**
   * Validate session and device binding
   */
  async validateSession(
    sessionId: string,
    userId: string,
    deviceFingerprint: string,
    ipAddress: string,
  ): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      await this.logSecurityEvent(userId, 'INVALID_SESSION', {
        sessionId,
        deviceFingerprint,
        ipAddress,
      });
      return false;
    }

    // Validate user
    if (session.userId !== userId) {
      await this.logSecurityEvent(userId, 'SESSION_HIJACK_ATTEMPT', {
        sessionId,
        expectedUserId: session.userId,
        attemptedUserId: userId,
      });
      throw new ForbiddenException('Session validation failed');
    }

    // Validate device fingerprint
    if (session.deviceFingerprint !== deviceFingerprint) {
      await this.logSecurityEvent(userId, 'DEVICE_MISMATCH', {
        sessionId,
        expectedFingerprint: session.deviceFingerprint,
        attemptedFingerprint: deviceFingerprint,
      });
      throw new ForbiddenException('Device mismatch detected. Please re-authenticate.');
    }

    // Update last activity
    session.lastActivity = new Date();

    return true;
  }

  /**
   * Validate content access request
   */
  async validateContentAccess(
    userId: string,
    stepId: string,
    sessionId: string,
    requestToken: string,
    deviceFingerprint: string,
    ipAddress: string,
  ): Promise<boolean> {
    // Validate session
    const isSessionValid = await this.validateSession(
      sessionId,
      userId,
      deviceFingerprint,
      ipAddress,
    );

    if (!isSessionValid) {
      return false;
    }

    // Validate request token (prevent replay attacks)
    const expectedToken = this.generateSecureToken(sessionId, userId, deviceFingerprint);
    
    if (requestToken !== expectedToken) {
      await this.logSecurityEvent(userId, 'TOKEN_MISMATCH', {
        sessionId,
        stepId,
        ipAddress,
      });
      throw new ForbiddenException('Invalid request token');
    }

    // Check for suspicious activity patterns
    await this.checkSuspiciousActivity(userId, stepId, ipAddress);

    return true;
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session && session.userId === userId) {
      this.activeSessions.delete(sessionId);
      const currentCount = this.userSessionCount.get(userId) || 0;
      this.userSessionCount.set(userId, Math.max(0, currentCount - 1));

      await this.logSecurityEvent(userId, 'SESSION_INVALIDATED', { sessionId });
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllSessions(userId: string): Promise<number> {
    let count = 0;
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.activeSessions.delete(sessionId);
        count++;
      }
    }
    
    this.userSessionCount.set(userId, 0);

    await this.logSecurityEvent(userId, 'ALL_SESSIONS_INVALIDATED', { count });

    return count;
  }

  /**
   * Generate device fingerprint from request info
   */
  generateDeviceFingerprint(
    userAgent: string,
    acceptLanguage: string,
    screenResolution?: string,
    timezone?: string,
  ): string {
    const components = [
      userAgent,
      acceptLanguage,
      screenResolution || 'unknown',
      timezone || 'unknown',
    ];
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(
    userId: string,
    stepId: string,
    ipAddress: string,
  ): Promise<void> {
    // Get recent access logs for this user
    const recentLogs = await this.prisma.audit_logs.findMany({
      where: {
        userId,
        entityType: 'ContentAccess',
        timestamp: {
          gte: new Date(Date.now() - 60000), // Last minute
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Check for rapid-fire requests (potential automation)
    if (recentLogs.length > 10) {
      await this.logSecurityEvent(userId, 'RAPID_ACCESS_DETECTED', {
        requestCount: recentLogs.length,
        stepId,
        ipAddress,
      });
      throw new ForbiddenException('Too many requests. Please slow down.');
    }

    // Check for impossible travel (different IPs in short time)
    const distinctIps = new Set(
      recentLogs
        .filter(log => log.ipAddress)
        .map(log => log.ipAddress),
    );
    
    if (distinctIps.size > 3) {
      await this.logSecurityEvent(userId, 'MULTIPLE_IP_ADDRESSES', {
        ipCount: distinctIps.size,
        ips: Array.from(distinctIps),
        stepId,
      });
      // Don't block, just log - could be VPN usage
    }
  }

  /**
   * Generate secure token for request validation
   */
  private generateSecureToken(
    sessionId: string,
    userId: string,
    deviceFingerprint: string,
  ): string {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const data = `${sessionId}:${userId}:${deviceFingerprint}`;
    
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    userId: string,
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId,
        action: AuditAction.USER_UPDATED, // Using existing action type
        entityType: 'SecurityEvent',
        entityId: eventType,
        description: `Security event: ${eventType}`,
        ipAddress: metadata.ipAddress,
        metadata: {
          eventType,
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Validate API request for tampering
   */
  async validateApiRequest(
    userId: string,
    endpoint: string,
    method: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<boolean> {
    // Log API access
    await this.prisma.audit_logs.create({
      data: {
        id: uuidv4(),
        userId,
        action: AuditAction.USER_UPDATED,
        entityType: 'ApiAccess',
        entityId: endpoint,
        description: `API ${method} ${endpoint}`,
        ipAddress,
        userAgent,
        metadata: {
          method,
          endpoint,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return true;
  }

  /**
   * Get active sessions for a user
   */
  getActiveSessions(userId: string): SessionInfo[] {
    const sessions: SessionInfo[] = [];
    
    for (const session of this.activeSessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  cleanupExpiredSessions(maxAgeMinutes: number = 30): number {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.activeSessions.delete(sessionId);
        const currentCount = this.userSessionCount.get(session.userId) || 0;
        this.userSessionCount.set(session.userId, Math.max(0, currentCount - 1));
        cleaned++;
      }
    }

    return cleaned;
  }
}
