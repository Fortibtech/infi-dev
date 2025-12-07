import { Module } from '@nestjs/common';
import { JobsFtService } from './jobs_ft.service';
import { JobsFtController } from './jobs_ft.controller';

@Module({
  controllers: [JobsFtController],
  providers: [JobsFtService],
})
export class JobsFtModule {}
