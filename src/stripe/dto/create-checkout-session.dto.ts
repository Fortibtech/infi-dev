import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { PlanType } from '@prisma/client';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Type de plan à souscrire',
    enum: PlanType,
    example: 'STANDARD',
  })
  @IsNotEmpty()
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiProperty({
    description: 'URL de retour en cas de succès',
    example: 'https://votre-app.com/success',
  })
  @IsNotEmpty()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  successUrl: string;

  @ApiProperty({
    description: "URL de retour en cas d'annulation",
    example: 'https://votre-app.com/cancel',
  })
  @IsNotEmpty()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  cancelUrl: string;

  @ApiProperty({
    description: 'Données supplémentaires pour la session',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, string>;
}
