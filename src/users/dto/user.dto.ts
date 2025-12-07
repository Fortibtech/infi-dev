import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

// Nous définirons ProfileDto plus tard dans le module profiles
export class ProfileDto {
  @ApiProperty({
    description: 'Identifiant unique du profil (UUID)',
    example: 'd9e9f9g0-1234-5678-9abc-def123456789',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    description: "Nom de l'utilisateur",
    example: 'Dupont',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;
}

export class UserDto {
  @ApiProperty({
    description: "Identifiant unique de l'utilisateur (UUID)",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'utilisateur@exemple.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Indique si l'utilisateur est actif",
    example: true,
    default: true,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: "Indique si l'email de l'utilisateur est vérifié",
    example: false,
    default: false,
  })
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({
    description: 'Date de création du compte',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour du compte',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    description: "Profil associé à l'utilisateur",
    type: () => ProfileDto,
    required: false,
  })
  @IsOptional()
  profile?: ProfileDto;
}

export class UserCreateDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'utilisateur@exemple.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'motdepasse123',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: "Informations de profil associées à l'utilisateur",
    required: false,
  })
  @IsOptional()
  profile?: {
    create: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export class UserUpdateDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur",
    example: 'utilisateur@exemple.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "Statut d'activation du compte",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: "Statut de vérification de l'email",
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}

export class UserResponseDto extends UserDto {}
