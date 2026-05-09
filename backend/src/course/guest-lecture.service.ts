import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GuestLectureService {
  constructor(private prisma: PrismaService) {}

  async create(facultyId: string, collegeId: string, body: any) {
    return this.prisma.guest_lectures.create({
      data: {
        id: uuidv4(),
        facultyId,
        collegeId,
        title: body.title,
        description: body.description || '',
        speaker: body.speaker,
        speakerBio: body.speakerBio || null,
        type: body.type || 'GUEST_LECTURE',
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        venue: body.venue || null,
        meetingLink: body.meetingLink || null,
        capacity: body.capacity || 50,
        department: body.department || null,
        status: 'UPCOMING',
      },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findAll(collegeId: string, status?: string) {
    const where: any = { collegeId };
    if (status) where.status = status;

    return this.prisma.guest_lectures.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getMyLectures(facultyId: string) {
    return this.prisma.guest_lectures.findMany({
      where: { facultyId },
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getMyRegistrations(userId: string) {
    const student = await this.prisma.students.findFirst({ where: { userId } });
    if (!student) throw new NotFoundException('Student not found');

    const regs = await this.prisma.guest_lecture_registrations.findMany({
      where: { studentId: student.id },
      include: {
        lecture: {
          include: {
            creator: { select: { fullName: true } },
          },
        },
      },
      orderBy: { registeredAt: 'desc' },
    });

    return regs.map(r => ({
      ...r.lecture,
      registeredAt: r.registeredAt,
      attended: r.attended,
      meetingLink: r.lecture.meetingLink, // Visible after registration
    }));
  }

  async findOne(id: string) {
    const lecture = await this.prisma.guest_lectures.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
        registrations: {
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        },
        _count: { select: { registrations: true } },
      },
    });
    if (!lecture) throw new NotFoundException('Guest lecture not found');
    return lecture;
  }

  async update(id: string, userId: string, body: any) {
    const lecture = await this.prisma.guest_lectures.findFirst({
      where: { id, facultyId: userId },
    });
    if (!lecture) throw new NotFoundException('Lecture not found or not owned by you');

    return this.prisma.guest_lectures.update({
      where: { id },
      data: {
        title: body.title ?? lecture.title,
        description: body.description ?? lecture.description,
        speaker: body.speaker ?? lecture.speaker,
        speakerBio: body.speakerBio ?? lecture.speakerBio,
        type: body.type ?? lecture.type,
        date: body.date ? new Date(body.date) : lecture.date,
        startTime: body.startTime ?? lecture.startTime,
        endTime: body.endTime ?? lecture.endTime,
        venue: body.venue ?? lecture.venue,
        meetingLink: body.meetingLink ?? lecture.meetingLink,
        capacity: body.capacity ?? lecture.capacity,
        status: body.status ?? lecture.status,
        department: body.department ?? lecture.department,
      },
    });
  }

  async remove(id: string, userId: string) {
    const lecture = await this.prisma.guest_lectures.findFirst({
      where: { id, facultyId: userId },
    });
    if (!lecture) throw new NotFoundException('Lecture not found or not owned by you');

    await this.prisma.guest_lectures.delete({ where: { id } });
    return { message: 'Lecture deleted' };
  }

  async register(lectureId: string, userId: string) {
    const student = await this.prisma.students.findFirst({ where: { userId } });
    if (!student) throw new BadRequestException('Student record not found');

    // Perform all checks and writes inside an interactive transaction to prevent
    // race conditions where two concurrent requests both pass the capacity check.
    const reg = await this.prisma.$transaction(async (tx) => {
      const lecture = await tx.guest_lectures.findUnique({
        where: { id: lectureId },
      });
      if (!lecture) throw new NotFoundException('Lecture not found');
      if (lecture.status !== 'UPCOMING') throw new BadRequestException('Registration is closed');
      if (lecture.registrationCount >= lecture.capacity) throw new BadRequestException('Lecture is full');

      const existing = await tx.guest_lecture_registrations.findUnique({
        where: { lectureId_studentId: { lectureId, studentId: student.id } },
      });
      if (existing) throw new BadRequestException('Already registered');

      const created = await tx.guest_lecture_registrations.create({
        data: { id: uuidv4(), lectureId, studentId: student.id },
      });
      await tx.guest_lectures.update({
        where: { id: lectureId },
        data: { registrationCount: { increment: 1 } },
      });

      return { ...created, meetingLink: lecture.meetingLink };
    });

    return { ...reg, message: 'Registration successful' };
  }

  async unregister(lectureId: string, userId: string) {
    const student = await this.prisma.students.findFirst({ where: { userId } });
    if (!student) throw new BadRequestException('Student record not found');

    const reg = await this.prisma.guest_lecture_registrations.findUnique({
      where: { lectureId_studentId: { lectureId, studentId: student.id } },
    });
    if (!reg) throw new NotFoundException('Registration not found');

    await this.prisma.$transaction([
      this.prisma.guest_lecture_registrations.delete({
        where: { id: reg.id },
      }),
      this.prisma.guest_lectures.update({
        where: { id: lectureId },
        data: { registrationCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Registration cancelled' };
  }

  async markAttendance(lectureId: string, facultyId: string, studentIds: string[]) {
    const lecture = await this.prisma.guest_lectures.findFirst({
      where: { id: lectureId, facultyId },
    });
    if (!lecture) throw new NotFoundException('Lecture not found');

    // Reset all registrations for this lecture, then mark only the selected ones
    await this.prisma.guest_lecture_registrations.updateMany({
      where: { lectureId },
      data: { attended: false },
    });

    if (studentIds.length > 0) {
      await this.prisma.guest_lecture_registrations.updateMany({
        where: { lectureId, studentId: { in: studentIds } },
        data: { attended: true },
      });
    }

    return { message: 'Attendance marked', count: studentIds.length };
  }
}
