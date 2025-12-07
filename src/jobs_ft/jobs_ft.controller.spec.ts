import { Test, TestingModule } from '@nestjs/testing';
import { JobsFtController } from './jobs_ft.controller';
import { JobsFtService } from './jobs_ft.service';

describe('JobsFtController', () => {
  let controller: JobsFtController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobsFtController],
      providers: [JobsFtService],
    }).compile();

    controller = module.get<JobsFtController>(JobsFtController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
