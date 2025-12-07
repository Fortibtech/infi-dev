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
  Query,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ProfileDto,
  ProfileCreateDto,
  ProfileUpdateDto,
} from './dto/profile.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Profile } from '@prisma/client';

@ApiTags('Profils')
@Controller('profiles')
@UseInterceptors(ClassSerializerInterceptor)
export class ProfilesController {
  constructor(private readonly profileService: ProfilesService) {}

  private transformToProfileDto(profile: Profile): ProfileDto {
    const profileDto = new ProfileDto();
    Object.assign(profileDto, profile);
    return profileDto;
  }

  @Get()
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

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Rechercher des profils par nom complet' })
  @ApiQuery({
    name: 'fullName',
    type: String,
    required: false,
    description: 'Recherche par nom complet',
  })
  @ApiResponse({
    status: 200,
    description: 'Profils trouvés avec succès',
    type: [ProfileDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé - Token JWT manquant ou invalide',
  })
  async searchProfiles(
    @Query('fullName') fullName?: string,
  ): Promise<ProfileDto[]> {
    const profiles = await this.profileService.getProfilesByFullName(
      fullName || '',
    );
    return profiles.map((profile) => this.transformToProfileDto(profile));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un profil par son ID' })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: ProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profil non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID du profil à récupérer',
  })
  async getProfileById(@Param('id') id: string): Promise<ProfileDto> {
    const profile = await this.profileService.profile({ where: { id } });

    if (!profile) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }

    return this.transformToProfileDto(profile);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: "Récupérer le profil d'un utilisateur par son ID" })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: ProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profil non trouvé pour cet utilisateur',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: "ID de l'utilisateur dont on veut récupérer le profil",
  })
  async getProfileByUserId(
    @Param('userId') userId: string,
  ): Promise<ProfileDto> {
    const profile = await this.profileService.profileByUserId(userId);

    if (!profile) {
      throw new NotFoundException(
        `Profil non trouvé pour l'utilisateur avec l'ID ${userId}`,
      );
    }

    return this.transformToProfileDto(profile);
  }

  @Post()
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
  @ApiOperation({ summary: 'Mettre à jour un profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    type: ProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profil non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID du profil à mettre à jour',
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() data: ProfileUpdateDto,
  ): Promise<ProfileDto> {
    // Vérifier si le profil existe
    const existingProfile = await this.profileService.profile({
      where: { id },
    });

    if (!existingProfile) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }

    const profile = await this.profileService.updateProfile({
      where: { id },
      data,
    });

    return this.transformToProfileDto(profile);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un profil' })
  @ApiResponse({
    status: 200,
    description: 'Profil supprimé avec succès',
    type: ProfileDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profil non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID du profil à supprimer',
  })
  async deleteProfile(@Param('id') id: string): Promise<ProfileDto> {
    // Vérifier si le profil existe
    const existingProfile = await this.profileService.profile({
      where: { id },
    });

    if (!existingProfile) {
      throw new NotFoundException(`Profil avec l'ID ${id} non trouvé`);
    }

    const profile = await this.profileService.deleteProfile({ id });

    return this.transformToProfileDto(profile);
  }
}
