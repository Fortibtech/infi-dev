import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobsFtDto {
  @ApiProperty({
    description: 'Nom du job',
    example: 'Développeur Full Stack',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Nom de la sous-catégorie',
    example: 'Fibres et papier',
  })
  @IsString()
  @IsNotEmpty()
  subCategoryName: string;

  @ApiProperty({
    description: 'Code du job (optionnel)',
    example: '34534654',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  code: string;
}
