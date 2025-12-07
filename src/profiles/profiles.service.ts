import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Profile, Prisma } from '@prisma/client';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async profile(params: {
    where: Prisma.ProfileWhereUniqueInput;
  }): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: params.where,
    });
  }

  async profileByUserId(userId: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { userId },
    });
  }

  async profiles(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProfileWhereUniqueInput;
    where?: Prisma.ProfileWhereInput;
    orderBy?: Prisma.ProfileOrderByWithRelationInput;
  }): Promise<Profile[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.profile.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createProfile(data: Prisma.ProfileCreateInput): Promise<Profile> {
    return this.prisma.profile.create({
      data,
    });
  }

  async updateProfile(params: {
    where: Prisma.ProfileWhereUniqueInput;
    data: Prisma.ProfileUpdateInput;
  }): Promise<Profile> {
    const { where, data } = params;
    return this.prisma.profile.update({
      data,
      where,
    });
  }

  async deleteProfile(where: Prisma.ProfileWhereUniqueInput): Promise<Profile> {
    return this.prisma.profile.delete({
      where,
    });
  }

  async getProfilesByName(
    firstName: string,
    lastName: string,
  ): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      where: {
        OR: [
          { firstName: { contains: firstName, mode: 'insensitive' } },
          { lastName: { contains: lastName, mode: 'insensitive' } },
        ],
      },
    });
  }

  async getProfilesByFullName(fullName: string): Promise<Profile[]> {
    if (!fullName) {
      return this.profiles({});
    }

    return this.prisma.profile.findMany({
      where: {
        OR: [
          { firstName: { contains: fullName, mode: 'insensitive' } },
          { lastName: { contains: fullName, mode: 'insensitive' } },
        ],
      },
    });
  }
}
