import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.guard';
import { UserType } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from 'src/auth/types';
import { SearchCompanyDto } from './dto/search-company.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.RECRUITER)
@ApiBearerAuth('JWT-auth')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto, @Req() req: Request) {
    return this.companyService.create(
      createCompanyDto,
      req.user as AuthenticatedUser,
    );
  }

  @Get('search')
  search(@Query() searchCompanyDto: SearchCompanyDto) {
    return this.companyService.search(searchCompanyDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companyService.update(id, updateCompanyDto);
  }

}
