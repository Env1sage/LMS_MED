import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePublisherProfileDto, ChangePasswordDto, PublisherProfileResponseDto } from './dto/profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PublisherProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get publisher profile by user ID
   * Returns both editable and read-only fields
   */
  async getProfile(userId: string): Promise<PublisherProfileResponseDto> {
    // Get user to find their publisher
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { publishers: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.publisherId || !user.publishers) {
      throw new ForbiddenException('User is not associated with a publisher');
    }

    const publisher = user.publishers;

    return {
      // Editable fields
      companyName: publisher.name,
      contactPerson: publisher.contactPerson,
      contactEmail: publisher.contactEmail,
      physicalAddress: publisher.physicalAddress || null,

      // Read-only fields
      publisherCode: publisher.code,
      contractStartDate: publisher.contractStartDate,
      contractEndDate: publisher.contractEndDate,
      status: publisher.status,
      legalName: publisher.legalName,
      createdAt: publisher.createdAt,
    };
  }

  /**
   * Update publisher profile
   * Only allows updating editable fields
   */
  async updateProfile(userId: string, dto: UpdatePublisherProfileDto): Promise<PublisherProfileResponseDto> {
    // Get user to find their publisher
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: { publishers: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.publisherId || !user.publishers) {
      throw new ForbiddenException('User is not associated with a publisher');
    }

    // Update only editable fields
    const updatedPublisher = await this.prisma.publishers.update({
      where: { id: user.publisherId },
      data: {
        ...(dto.companyName && { name: dto.companyName }),
        ...(dto.contactPerson && { contactPerson: dto.contactPerson }),
        ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
        ...(dto.physicalAddress !== undefined && { physicalAddress: dto.physicalAddress }),
        updatedAt: new Date(),
      },
    });

    return {
      companyName: updatedPublisher.name,
      contactPerson: updatedPublisher.contactPerson,
      contactEmail: updatedPublisher.contactEmail,
      physicalAddress: updatedPublisher.physicalAddress || null,
      publisherCode: updatedPublisher.code,
      contractStartDate: updatedPublisher.contractStartDate,
      contractEndDate: updatedPublisher.contractEndDate,
      status: updatedPublisher.status,
      legalName: updatedPublisher.legalName,
      createdAt: updatedPublisher.createdAt,
    };
  }

  /**
   * Change user password
   * Requires current password verification
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    return { message: 'Password updated successfully' };
  }
}
