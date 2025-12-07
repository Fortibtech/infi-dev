import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProfileDto {
  @ApiProperty({
    description: 'Identifiant unique du profil (UUID)',
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur",
    example: '+33612345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Identifiant LinkedIn unique',
    example: 'linked-in-id-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  linkedinId?: string;

  @ApiProperty({
    description: 'Données du profil LinkedIn',
    example:
      '{"name": "Jean Dupont", "pictureUrl": "https://example.com/image.jpg"}',
    required: false,
  })
  @IsOptional()
  @IsObject()
  linkedinProfile?: Record<string, any>;

  @ApiProperty({
    description: 'Date de création du profil',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour du profil',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  updatedAt: Date;

  @ApiProperty({
    description: "Identifiant de l'utilisateur associé à ce profil",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  @IsUUID()
  userId: string;
}

export class ProfileCreateDto {
  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur",
    example: '+33612345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Identifiant LinkedIn unique',
    example: 'linked-in-id-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  linkedinId?: string;

  @ApiProperty({
    description: 'Données du profil LinkedIn',
    example:
      '{"name": "Jean Dupont", "pictureUrl": "https://example.com/image.jpg"}',
    required: false,
  })
  @IsOptional()
  @IsObject()
  linkedinProfile?: Record<string, any>;

  @ApiProperty({
    description: 'Association avec un utilisateur existant',
    example: '{ "connect": { "id": "c8d8e8f0-1234-5678-9abc-def123456789" } }',
    required: true,
  })
  user: {
    connect: {
      id: string;
    };
  };
}

export class ProfileUpdateDto {
  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur",
    example: '+33612345678',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Identifiant LinkedIn unique',
    example: 'linked-in-id-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  linkedinId?: string;

  @ApiProperty({
    description: 'Données du profil LinkedIn',
    example:
      '{"name": "Jean Dupont", "pictureUrl": "https://example.com/image.jpg"}',
    required: false,
  })
  @IsOptional()
  @IsObject()
  linkedinProfile?: Record<string, any>;
}
