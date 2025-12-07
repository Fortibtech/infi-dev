import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsPositive } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SearchCompanyDto {
  @ApiProperty({
    description: 'Terme de recherche',
    example: 'Google',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Numéro de page (commence à 1)',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiProperty({
    description: "Nombre d'éléments par page",
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value) || 10)
  take?: number = 10;
}
