import { ApiProperty } from '@nestjs/swagger';
import { StudyLevelType } from '@prisma/client';

export class StudyLevel {
  @ApiProperty({
    description: "L'identifiant unique du niveau d'études",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
  })
  id: string;

  @ApiProperty({
    description: "Le type de niveau d'études",
    enum: StudyLevelType,
    enumName: 'StudyLevelType',
    example: 'BAC_PLUS_5',
  })
  type: StudyLevelType;

  @ApiProperty({
    description: "Date de création du niveau d'études",
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: "Date de dernière mise à jour du niveau d'études",
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: "L'identifiant du profil associé",
    example: 'c8d8e8f0-1234-5678-9abc-def123456789',
    required: false,
  })
  profileId?: string;
}
