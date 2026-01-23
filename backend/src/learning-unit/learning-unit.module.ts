import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LearningUnitController } from './learning-unit.controller';
import { LearningUnitService } from './learning-unit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PublisherAdminModule } from '../publisher-admin/publisher-admin.module';
import { PublisherContractGuard } from '../auth/guards/publisher-contract.guard';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PublisherAdminModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [LearningUnitController],
  providers: [LearningUnitService, PublisherContractGuard],
  exports: [LearningUnitService],
})
export class LearningUnitModule {}
