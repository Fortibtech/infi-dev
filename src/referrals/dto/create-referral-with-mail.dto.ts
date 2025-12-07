import { IsEmail, IsNotEmpty, IsString, IsEnum, Length } from "class-validator";
import { RelationType } from "../enums/relation-type.enum";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReferralWithMailDto {
  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Prénom de l\'utilisateur',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Nom de l\'utilisateur',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Message de l\'utilisateur',
    example: 'Bonjour, je souhaite être référé par vous.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  message: string;

  @ApiProperty({
    description: 'Type de relation de l\'utilisateur',
    example: 'PROFESSIONAL',
  })
  @IsEnum(RelationType)
  @IsNotEmpty()
  relationType: RelationType;
}
