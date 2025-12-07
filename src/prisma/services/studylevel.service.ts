import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Profile, Prisma, StudyLevel } from '@prisma/client';

@Injectable()
export class StudyLevelService {
  constructor(private prisma: PrismaService) {}

  async createStudyLevel(
    data: Prisma.StudyLevelCreateInput,
  ): Promise<StudyLevel> {
    return this.prisma.studyLevel.create({
      data,
    });
  }

  async updateStudyLevel(params: {
    where: Prisma.StudyLevelWhereUniqueInput;
    data: Prisma.StudyLevelUpdateInput;
  }): Promise<StudyLevel> {
    const { where, data } = params;
    return this.prisma.studyLevel.update({
      where,
      data,
    });
  }

  async deleteStudyLevel(
    where: Prisma.StudyLevelWhereUniqueInput,
  ): Promise<StudyLevel> {
    return this.prisma.studyLevel.delete({
      where,
    });
  }
}
