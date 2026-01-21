import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Parse DATABASE_URL for pg Pool
    const dbUrl = new URL(process.env.DATABASE_URL!);
    const pool = new Pool({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port),
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      ssl: false,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['query', 'error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
