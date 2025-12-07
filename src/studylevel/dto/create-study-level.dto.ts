import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StudyLevelType } from '@prisma/client';

export class CreateStudyLevelDto {
  @ApiProperty({
    description: "Le niveau d'études de l'utilisateur",
    enum: StudyLevelType,
    enumName: 'StudyLevelType',
    example: 'BAC_PLUS_5',
  })
  @IsEnum(StudyLevelType)
  @IsNotEmpty()
  studyLevel: StudyLevelType;
}
