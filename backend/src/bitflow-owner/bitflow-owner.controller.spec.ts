import { Test, TestingModule } from '@nestjs/testing';
import { BitflowOwnerController } from './bitflow-owner.controller';

describe('BitflowOwnerController', () => {
  let controller: BitflowOwnerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitflowOwnerController],
    }).compile();

    controller = module.get<BitflowOwnerController>(BitflowOwnerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
