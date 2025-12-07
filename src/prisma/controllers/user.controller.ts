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
import { UsersService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  UserResponseDto,
} from '../dto/user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('Utilisateurs')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs récupérée avec succès',
    type: [UserResponseDto],
  })
  async getAllUsers(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<UserResponseDto[]> {
    const params: any = {};

    if (skip) params.skip = +skip;
    if (take) params.take = +take;

    const users = await this.usersService.users(params);

    return users.map((user) => {
      const { password, verificationToken, tokenExpiry, ...result } = user;
      return result as UserResponseDto;
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer un utilisateur par ID' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur", type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur récupéré avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.user({ id });
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    const { password, verificationToken, tokenExpiry, ...result } = user;
    return result as UserResponseDto;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès',
    type: UserResponseDto,
  })
  async createUser(@Body() data: UserCreateDto): Promise<UserResponseDto> {
    // Hasher le mot de passe si fourni
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const user = await this.usersService.createUser(data);

    const { password, verificationToken, tokenExpiry, ...result } = user;
    return result as UserResponseDto;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur", type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async updateUser(
    @Param('id') id: string,
    @Body() data: UserUpdateDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.updateUser({
        where: { id },
        data,
      });

      const { password, verificationToken, tokenExpiry, ...result } = user;
      return result as UserResponseDto;
    } catch (error) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur", type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur supprimé avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async deleteUser(@Param('id') id: string): Promise<UserResponseDto> {
    try {
      const user = await this.usersService.deleteUser({ id });

      const { password, verificationToken, tokenExpiry, ...result } = user;
      return result as UserResponseDto;
    } catch (error) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }
  }
}
