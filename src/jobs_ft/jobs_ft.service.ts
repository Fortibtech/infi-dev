import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateJobsFtDto } from './dto/create-jobs_ft.dto';
import { UpdateJobsFtDto } from './dto/update-jobs_ft.dto';
import { JobsFt, JobLevel } from './entities/jobs_ft.entity';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class JobsFtService {
  constructor(private prisma: PrismaService) {}

  async create(createJobsFtDto: CreateJobsFtDto) {
    const { name, subCategoryName, code } = createJobsFtDto;

    const subCategory = await this.prisma.job.findFirst({
      where: {
        name: subCategoryName,
      },
    });

    if (!subCategory) {
      throw new NotFoundException(
        `SubCategory with name "${subCategoryName}" not found`,
      );
    }

    const job = await this.prisma.job.create({
      data: {
        name,
        identifiers: subCategory.identifiers,
        parentId: subCategory.id,
        code,
        level: JobLevel.JOB,
      },
    });

    return job;
  }

  async findMainJobs() {
    return this.prisma.job.findMany({
      where: {
        level: JobLevel.MAIN_CATEGORY,
      },
      orderBy: {
        identifiers: 'asc',
      },
    });
  }

  async findSubCategories(mainJobName: string) {
    const mainJob = await this.prisma.job.findFirst({
      where: {
        name: mainJobName,
      },
    });
    if (!mainJob) {
      throw new NotFoundException(`Job with name "${mainJobName}" not found`);
    }
    if (!mainJob.identifiers) {
      throw new NotFoundException(
        `Job with name "${mainJobName}" has no identifiers`,
      );
    }
    const identifiers = mainJob.identifiers[0];
    const subCategories = await this.prisma.job.findMany({
      where: {
        identifiers: {
          contains: identifiers,
        },
        level: JobLevel.SUB_CATEGORY,
      },
      orderBy: {
        identifiers: 'asc',
      },
    });
    return subCategories;
  }

  async findJobs(subCategoryName: string) {
    const subCategory = await this.prisma.job.findFirst({
      where: {
        name: subCategoryName,
      },
    });

    if (!subCategory) {
      throw new NotFoundException(
        `SubCategory with name "${subCategoryName}" not found`,
      );
    }

    const jobs = await this.prisma.job.findMany({
      where: {
        parentId: subCategory.id,
        level: JobLevel.JOB,
      },
      orderBy: {
        identifiers: 'asc',
      },
    });
    return jobs;
  }

  update(id: number, updateJobsFtDto: UpdateJobsFtDto) {
    return `This action updates a #${id} jobsFt`;
  }

  async remove(jobId: string) {
    return this.prisma.job.delete({
      where: {
        id: jobId,
      },
    });
  }
}
