import { Module } from '@nestjs/common';
import { BitflowOwnerService } from './bitflow-owner.service';
import { BitflowOwnerController } from './bitflow-owner.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [BitflowOwnerService],
  controllers: [BitflowOwnerController]
})
export class BitflowOwnerModule {}
