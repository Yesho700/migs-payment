import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  provider: string;

  @IsString()
  listing: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message?: string;
}