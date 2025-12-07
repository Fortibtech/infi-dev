import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReferralStatus } from '@prisma/client';

export class UpdateReferralDto {
  @ApiProperty({
    description: 'Statut de la demande de référence',
    enum: ReferralStatus,
    example: 'ACCEPTED',
    required: true,
  })
  @IsEnum(ReferralStatus)
  status: ReferralStatus;

  @ApiProperty({
    description: 'Message de réponse optionnel du référent',
    example: 'Je vous accepte avec plaisir comme référé.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  responseMessage?: string;
}
