import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, PublisherStatus } from '@prisma/client';

/**
 * Guard to check if publisher's contract is valid
 * - Blocks access if contract is expired
 * - Blocks access if publisher is suspended
 */
@Injectable()
export class PublisherContractGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only check for publisher admins
    if (!user || user.role !== UserRole.PUBLISHER_ADMIN) {
      return true;
    }

    if (!user.publisherId) {
      throw new ForbiddenException('Publisher ID not found');
    }

    // Get publisher details
    const publisher = await this.prisma.publishers.findUnique({
      where: { id: user.publisherId },
    });

    if (!publisher) {
      throw new ForbiddenException('Publisher not found');
    }

    // Check if suspended
    if (publisher.status === PublisherStatus.SUSPENDED) {
      throw new ForbiddenException('Your publisher account has been suspended. Please contact Bitflow support.');
    }

    // Check if contract expired
    if (publisher.contractEndDate && new Date(publisher.contractEndDate) < new Date()) {
      throw new ForbiddenException('Your publisher contract has expired. Please contact Bitflow to renew your contract.');
    }

    return true;
  }
}
