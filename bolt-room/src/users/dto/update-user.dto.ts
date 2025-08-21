import { 
  IsOptional, 
  IsString, 
  IsEnum, 
  IsNumber, 
  IsArray, 
  IsObject, 
  IsBoolean,
  ValidateNested,
  MinLength,
  MaxLength,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateLocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCoordinatesDto)
  coordinates?: UpdateCoordinatesDto;
}

class UpdateCoordinatesDto {
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(80)
  age?: number;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsEnum(['student', 'working'])
  occupation?: string;

  @IsOptional()
  @IsEnum(['vegetarian', 'non-vegetarian'])
  foodPreference?: string;

  @IsOptional()
  @IsEnum(['smoker', 'non-smoker'])
  smokingPreference?: string;

  @IsOptional()
  @IsEnum(['introvert', 'extrovert', 'ambivert'])
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}