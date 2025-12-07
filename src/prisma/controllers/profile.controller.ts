import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  NotFoundException,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ProfileDto,
  ProfileCreateDto,
  ProfileUpdateDto,
} from '../dto/profile.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Profile } from '@prisma/client';

@ApiTags('Profils')
@Controller('profiles')
@UseInterceptors(ClassSerializerInterceptor)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Méthode utilitaire pour transformer les valeurs null en undefined
  private transformToProfileDto(profile: Profile): ProfileDto {
    return {
      id: profile.id,
      firstName: profile.firstName ?? undefined,
      lastName: profile.lastName ?? undefined,
      phoneNumber: profile.phoneNumber ?? undefined,
      linkedinId: profile.linkedinId ?? undefined,
      linkedinProfile: profile.linkedinProfile as
        | Record<string, any>
        | undefined,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      userId: profile.userId,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les profils' })
  @ApiResponse({
    status: 200,
    description: 'Liste des profils récupérée avec succès',
    type: [ProfileDto],
  })
  async getAllProfiles(): Promise<ProfileDto[]> {
    const profiles = await this.profileService.profiles({});
    return profiles.map((profile) => this.transformToProfileDto(profile));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un profil par ID' })
  @ApiParam({ name: 'id', description: 'ID du profil', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: ProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async getProfileById(@Param('id') id: string): Promise<ProfileDto> {
    const profile = await this.profileService.profile({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }
    return this.transformToProfileDto(profile);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Récupérer le profil d'un utilisateur" })
  @ApiParam({
    name: 'userId',
    description: "ID de l'utilisateur",
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: ProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async getProfileByUserId(
    @Param('userId') userId: string,
  ): Promise<ProfileDto> {
    const profile = await this.profileService.profileByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        `Profil pour l'utilisateur ${userId} non trouvé`,
      );
    }
    return this.transformToProfileDto(profile);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouveau profil' })
  @ApiResponse({
    status: 201,
    description: 'Profil créé avec succès',
    type: ProfileDto,
  })
  async createProfile(@Body() data: ProfileCreateDto): Promise<ProfileDto> {
    const profile = await this.profileService.createProfile(data);
    return this.transformToProfileDto(profile);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un profil' })
  @ApiParam({ name: 'id', description: 'ID du profil', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    type: ProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async updateProfile(
    @Param('id') id: string,
    @Body() data: ProfileUpdateDto,
  ): Promise<ProfileDto> {
    try {
      const profile = await this.profileService.updateProfile({
        where: { id },
        data,
      });
      return this.transformToProfileDto(profile);
    } catch (error) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un profil' })
  @ApiParam({ name: 'id', description: 'ID du profil', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Profil supprimé avec succès',
    type: ProfileDto,
  })
  @ApiResponse({ status: 404, description: 'Profil non trouvé' })
  async deleteProfile(@Param('id') id: string): Promise<ProfileDto> {
    try {
      const profile = await this.profileService.deleteProfile({ id });
      return this.transformToProfileDto(profile);
    } catch (error) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }
  }
}
