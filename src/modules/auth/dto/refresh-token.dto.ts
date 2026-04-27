import { IsString } from 'class-validator';

export class RefreshtokenDto {
  @IsString()
  refreshToken: string;
}
