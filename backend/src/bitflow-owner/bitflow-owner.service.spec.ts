import { Test, TestingModule } from '@nestjs/testing';
import { BitflowOwnerService } from './bitflow-owner.service';

describe('BitflowOwnerService', () => {
  let service: BitflowOwnerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BitflowOwnerService],
    }).compile();

    service = module.get<BitflowOwnerService>(BitflowOwnerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
