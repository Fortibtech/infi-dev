import { Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from 'src/database/prisma.service';
import { AuthenticatedUser } from 'src/auth/types';
import { SearchCompanyDto } from './dto/search-company.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCompanyDto: CreateCompanyDto, user: AuthenticatedUser) {
    return this.prisma.company.create({
      data: {
        ...createCompanyDto,
        user: {
          connect: { id: user.id },
        },
      },
    });
  }

  async search(searchCompanyDto: SearchCompanyDto) {
    const { query, page = 1, take = 10 } = searchCompanyDto;
    const skip = (page - 1) * take;

    const whereClause = query
      ? {
          OR: [
            { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { city: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {};

    const [results, total] = await Promise.all([
      this.prisma.company.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.company.count({
        where: whereClause,
      }),
    ]);

    return {
      data: results,
      meta: {
        total,
        page,
        take,
        pageCount: Math.ceil(total / take),
        hasPreviousPage: page > 1,
        hasNextPage: page < Math.ceil(total / take),
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} company`;
  }

  update(id: string, updateCompanyDto: UpdateCompanyDto) {
    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  remove(id: number) {
    return `This action removes a #${id} company`;
  }
}
