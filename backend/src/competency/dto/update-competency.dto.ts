import { IsString, IsOptional } from 'class-validator';

export class UpdateCompetencyDto {
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}
