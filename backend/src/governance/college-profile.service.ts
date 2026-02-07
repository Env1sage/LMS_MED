import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { UpdateCollegeProfileDto } from './dto/college-profile.dto';

@Injectable()
export class CollegeProfileService {
  constructor(
    private prisma: PrismaService,
    private auditLogService: AuditLogService,
  ) {}

  async getCollegeProfile(collegeId: string) {
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
      select: {
        id: true,
        name: true,
        code: true,
        emailDomain: true,
        adminContactEmail: true,
        address: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            departments: true,
            users: true,
            students: true,
          },
        },
      },
    });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    return college;
  }

  async updateCollegeProfile(
    collegeId: string,
    dto: UpdateCollegeProfileDto,
    updatedById: string,
  ) {
    const college = await this.prisma.colleges.findUnique({
      where: { id: collegeId },
    });

    if (!college) {
      throw new NotFoundException('College not found');
    }

    const updated = await this.prisma.colleges.update({
      where: { id: collegeId },
      data: {
        adminContactEmail: dto.adminContactEmail,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        code: true,
        emailDomain: true,
        adminContactEmail: true,
        address: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            departments: true,
            users: true,
            students: true,
          },
        },
      },
    });

    // Log the action
    await this.auditLogService.log(
      updatedById,
      'COLLEGE_PROFILE_UPDATED',
      'COLLEGE',
      collegeId,
      { changes: dto },
    );

    return updated;
  }
}
