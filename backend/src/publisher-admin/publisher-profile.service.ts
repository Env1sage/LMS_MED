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
      contactEmail: publisher.contactEmail,
      contactPhone: publisher.contactPhone,
      website: publisher.website,
      address: publisher.physicalAddress || null,
      city: publisher.city || null,
      state: publisher.state || null,
      description: publisher.description || null,
      logoUrl: publisher.logoUrl || null,

      // Read-only fields
      publisherCode: publisher.code,
      contractStartDate: publisher.contractStartDate,
      contractEndDate: publisher.contractEndDate,
      status: publisher.status,
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
        ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.address !== undefined && { physicalAddress: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.description !== undefined && { description: dto.description }),
        updatedAt: new Date(),
      },
    });

    return {
      companyName: updatedPublisher.name,
      contactEmail: updatedPublisher.contactEmail,
      contactPhone: updatedPublisher.contactPhone,
      website: updatedPublisher.website,
      address: updatedPublisher.physicalAddress || null,
      city: updatedPublisher.city || null,
      state: updatedPublisher.state || null,
      description: updatedPublisher.description || null,
      logoUrl: updatedPublisher.logoUrl || null,
      publisherCode: updatedPublisher.code,
      contractStartDate: updatedPublisher.contractStartDate,
      contractEndDate: updatedPublisher.contractEndDate,
      status: updatedPublisher.status,
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
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

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
