import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateAccessTokenDto {
  @IsString()
  @IsNotEmpty()
  learningUnitId: string;

  @IsString()
  @IsOptional()
  deviceType?: string; // web, mobile_ios, mobile_android
}
