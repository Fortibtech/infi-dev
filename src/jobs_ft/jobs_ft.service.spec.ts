import { Test, TestingModule } from '@nestjs/testing';
import { JobsFtService } from './jobs_ft.service';

describe('JobsFtService', () => {
  let service: JobsFtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsFtService],
    }).compile();

    service = module.get<JobsFtService>(JobsFtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
