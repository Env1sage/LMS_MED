import { IsString, IsNotEmpty, IsEnum, MinLength, MaxLength } from 'class-validator';
import { CompetencyDomain, AcademicLevel } from '@prisma/client';

export class CreateCompetencyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  description: string;

  @IsString()
  @IsNotEmpty()
  subject: string; // Anatomy, Pharmacology, etc.

  @IsEnum(CompetencyDomain)
  domain: CompetencyDomain;

  @IsEnum(AcademicLevel)
  academicLevel: AcademicLevel;
}
