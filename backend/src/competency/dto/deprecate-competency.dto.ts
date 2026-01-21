import { IsString, IsOptional, IsUUID } from 'class-validator';

export class DeprecateCompetencyDto {
  @IsOptional()
  @IsUUID()
  replacedBy?: string; // New competency ID that replaces this one
}
