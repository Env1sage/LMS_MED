import { Module } from '@nestjs/common';
import { CompetencyController } from './competency.controller';
import { CompetencyService } from './competency.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CompetencyController],
  providers: [CompetencyService],
  exports: [CompetencyService],
})
export class CompetencyModule {}
