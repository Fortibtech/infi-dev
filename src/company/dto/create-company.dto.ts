import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { CompanyType } from '../enums/company-type.enum';
import { CompanySector } from '@prisma/client';

export class CreateCompanyDto {
  @ApiProperty({
    description: "Nom de l'entreprise",
    example: 'Google',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: "SIRET de l'entreprise",
    example: '12345678901234',
  })
  @IsOptional()
  @IsString()
  siret: string;

  @ApiProperty({
    description: "Adresse de l'entreprise",
    example: '123 Rue de la Paix',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: "Code postal de l'entreprise",
    example: '75000',
  })
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty({
    description: "Ville de l'entreprise",
    example: 'Paris',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: "Type d'entreprise",
    enum: CompanyType,
    example: CompanyType.PE,
  })
  @IsNotEmpty()
  @IsEnum(CompanyType)
  companyType: CompanyType;

  @ApiProperty({
    description: "Secteur d'activité de l'entreprise",
    enum: CompanySector,
    example: CompanySector.IT,
  })
  @IsNotEmpty()
  @IsEnum(CompanySector)
  sector: CompanySector;

  @ApiProperty({
    description: "Effectif de l'entreprise",
    example: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  employeeCount: number;

  @ApiProperty({
    description: "Poste de l'utilisateur dans l'entreprise",
    example: 'Développeur',
  })
  @IsNotEmpty()
  @IsString()
  userPosition: string;
}
