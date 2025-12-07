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
import { UsersService } from './users.service';
import {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  UserResponseDto,
} from './dto/user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Utilisateurs')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les utilisateurs' })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs récupérée avec succès',
    type: [UserResponseDto],
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: "Nombre d'éléments à ignorer pour la pagination",
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: "Nombre d'éléments à retourner pour la pagination",
  })
  async getAllUsers(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.users({
      skip: skip ? +skip : undefined,
      take: take ? +take : undefined,
    });

    return users.map((user) => {
      const userResponse = new UserResponseDto();
      Object.assign(userResponse, user);
      return userResponse;
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un utilisateur par son ID' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur récupéré avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: "ID de l'utilisateur à récupérer",
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.user({ id });
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    const userResponse = new UserResponseDto();
    Object.assign(userResponse, user);
    return userResponse;
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès',
    type: UserResponseDto,
  })
  async createUser(@Body() data: UserCreateDto): Promise<UserResponseDto> {
    const user = await this.usersService.createUser(data);

    const userResponse = new UserResponseDto();
    Object.assign(userResponse, user);
    return userResponse;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur mis à jour avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: "ID de l'utilisateur à mettre à jour",
  })
  async updateUser(
    @Param('id') id: string,
    @Body() data: UserUpdateDto,
  ): Promise<UserResponseDto> {
    // Vérifier si l'utilisateur existe
    const existingUser = await this.usersService.user({ id });
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    const user = await this.usersService.updateUser({
      where: { id },
      data,
    });

    const userResponse = new UserResponseDto();
    Object.assign(userResponse, user);
    return userResponse;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur supprimé avec succès',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: "ID de l'utilisateur à supprimer",
  })
  async deleteUser(@Param('id') id: string): Promise<UserResponseDto> {
    // Vérifier si l'utilisateur existe
    const existingUser = await this.usersService.user({ id });
    if (!existingUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    const user = await this.usersService.deleteUser({ id });

    const userResponse = new UserResponseDto();
    Object.assign(userResponse, user);
    return userResponse;
  }
}
