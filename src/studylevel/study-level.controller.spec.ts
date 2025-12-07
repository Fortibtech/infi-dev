import { Test, TestingModule } from '@nestjs/testing';
import { StudyLevelController } from './study-level.controller';
import { StudyLevelService } from './study-level.service';

describe('StudyLevelController', () => {
  let controller: StudyLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudyLevelController],
      providers: [StudyLevelService],
    }).compile();

    controller = module.get<StudyLevelController>(StudyLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
