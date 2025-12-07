import { ApiProperty } from '@nestjs/swagger';

export class Referral {
  @ApiProperty({
    description: "L'identifiant unique de la référence",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Date de création de la référence',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: "L'identifiant de l'utilisateur qui a fait la référence",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  referrerId: string;

  @ApiProperty({
    description: "L'identifiant de l'utilisateur qui a été référé",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  affiliatedUserId: string;
}
