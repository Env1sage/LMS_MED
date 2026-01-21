import { IsString, IsNotEmpty } from 'class-validator';

export class ResetCredentialsDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
