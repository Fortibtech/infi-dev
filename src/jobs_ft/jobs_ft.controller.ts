import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { JobsFtService } from './jobs_ft.service';
import { CreateJobsFtDto } from './dto/create-jobs_ft.dto';
import { UpdateJobsFtDto } from './dto/update-jobs_ft.dto';

@Controller('jobs-ft')
export class JobsFtController {
  constructor(private readonly jobsFtService: JobsFtService) {}

  @Post('create-job')
  create(@Body() createJobsFtDto: CreateJobsFtDto) {
    return this.jobsFtService.create(createJobsFtDto);
  }

  @Get('main-jobs')
  findMainJobs() {
    return this.jobsFtService.findMainJobs();
  }

  @Get('find-sub-categories/:mainJobName')
  findSubCategories(@Param('mainJobName') mainJobName: string) {
    return this.jobsFtService.findSubCategories(mainJobName);
  }

  @Get('find-jobs/:subCategoryName')
  findJobs(@Param('subCategoryName') subCategoryName: string) {
    return this.jobsFtService.findJobs(subCategoryName);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobsFtDto: UpdateJobsFtDto) {
    return this.jobsFtService.update(+id, updateJobsFtDto);
  }

  @Delete(':jobId')
  remove(@Param('jobId') jobId: string) {
    return this.jobsFtService.remove(jobId);
  }
}
