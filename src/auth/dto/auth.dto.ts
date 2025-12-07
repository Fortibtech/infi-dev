import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '@prisma/client';

export class LoginDto {
  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'utilisateur@exemple.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur",
    example: 'motdepasse123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({
    description: "Type d'utilisateur par défaut USER",
    example: 'RECRUITER, RECOMMENDER',
    required: false,
  })
  @IsEnum(UserType)
  @IsOptional()
  type?: UserType;

  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'utilisateur@exemple.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Mot de passe de l'utilisateur (6 caractères minimum)",
    example: 'motdepasse123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: "Prénom de l'utilisateur",
    example: 'Jean',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: "Nom de famille de l'utilisateur",
    example: 'Dupont',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: "Numéro de téléphone de l'utilisateur (optionnel)",
    example: '+33612345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    description: 'Token de référence (optionnel)',
    example: '1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  referralToken?: string;
}

export class JwtPayload {
  @ApiProperty({
    description: "ID de l'utilisateur",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  sub: string;

  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'utilisateur@exemple.com',
  })
  email: string;
}

/**
 * Ancien type utilisé dans la doc, conservé si d’autres endpoints en dépendent.
 */
export class TokenResponse {
  @ApiProperty({
    description: "Token JWT d'authentification",
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

/**
 * Nouveau contrat de réponse pour login / register
 */
export class AuthUserResponse {
  @ApiProperty({ example: 'c8d8e8f0-1234-5678-9abc-def123456789' })
  id: string;

  @ApiProperty({ example: 'utilisateur@exemple.com' })
  email: string;

  @ApiProperty({ enum: UserType, example: UserType.USER })
  type: UserType;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({
    required: false,
    example: { firstName: 'Jean', lastName: 'Dupont' },
  })
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

export class AuthResponse {
  @ApiProperty({
    description: "Token JWT d'authentification",
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: "Indique si l'onboarding est terminé",
    example: false,
  })
  onboardingTermine: boolean;

  @ApiProperty({ type: AuthUserResponse })
  user: AuthUserResponse;

  @ApiProperty({
    description: 'Message optionnel (par exemple après inscription).',
    required: false,
    example: 'Un email de vérification a été envoyé à votre adresse email',
  })
  message?: string;
}
