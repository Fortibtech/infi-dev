import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StudyLevelService } from './study-level.service';
import { CreateStudyLevelDto } from './dto/create-study-level.dto';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserType } from '@prisma/client';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/guards/roles.guard';
import { SupabaseAuthGuard } from 'src/auth/guards/supabase-auth.guard';

@ApiTags("Niveaux d'études")
@Controller('study-levels')
export class StudyLevelController {
  constructor(private readonly studyLevelService: StudyLevelService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles(UserType.USER, UserType.RECOMMENDER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Définir le niveau d'études de l'utilisateur" })
  @ApiResponse({
    status: 201,
    description: "Niveau d'études enregistré avec succès",
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(
    @Body() createStudyLevelDto: CreateStudyLevelDto,
    @Req() req: Request,
  ) {
    return this.studyLevelService.create(createStudyLevelDto, req);
  }
}
