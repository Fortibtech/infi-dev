import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  Length,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RelationType } from '../enums/relation-type.enum';

export class CreateReferralDto {
  @ApiProperty({
    description: "ID de l'utilisateur à qui on demande d'être référent",
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: true,
  })
  @IsNotEmpty()
  @IsUUID()
  referrerId: string; // ID of the user who will refer (the receiver of the request)

  @ApiProperty({
    description: 'Message optionnel à destination du référent potentiel',
    example:
      'Bonjour, je souhaiterais que vous me référiez pour le poste de développeur.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;

  @ApiProperty({
    description: 'Type de relation entre le référent et le référé',
    example: RelationType.PROFESSIONAL,
    required: true,
  })
  @IsEnum(RelationType)
  relationType: RelationType; // Optional message to the potential referrer
}
