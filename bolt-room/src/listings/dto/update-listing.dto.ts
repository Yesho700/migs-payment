import { 
  IsString, 
  IsNumber, 
  IsObject, 
  IsArray, 
  IsOptional, 
  IsEnum, 
  IsBoolean,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateLocationDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsObject()
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

class UpdateFacilitiesDto {
  @IsOptional()
  @IsBoolean()
  wifi?: boolean;

  @IsOptional()
  @IsBoolean()
  ac?: boolean;

  @IsOptional()
  @IsBoolean()
  laundry?: boolean;

  @IsOptional()
  @IsBoolean()
  parking?: boolean;

  @IsOptional()
  @IsBoolean()
  food?: boolean;

  @IsOptional()
  @IsBoolean()
  gym?: boolean;

  @IsOptional()
  @IsBoolean()
  powerBackup?: boolean;
}

class UpdateAgeRangeDto {
  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(80)
  min?: number;

  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(80)
  max?: number;
}

class UpdateRoommatePreferencesDto {
  @IsOptional()
  @IsEnum(['male', 'female', 'any'])
  gender?: 'male' | 'female' | 'any';

  @IsOptional()
  @IsEnum(['vegetarian', 'non-vegetarian', 'any'])
  foodPreference?: 'vegetarian' | 'non-vegetarian' | 'any';

  @IsOptional()
  @IsEnum(['smoker', 'non-smoker', 'any'])
  smokingPreference?: 'smoker' | 'non-smoker' | 'any';

  @IsOptional()
  @IsEnum(['student', 'working', 'any'])
  occupation?: 'student' | 'working' | 'any';

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAgeRangeDto)
  ageRange?: UpdateAgeRangeDto;
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  location?: UpdateLocationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateFacilitiesDto)
  facilities?: UpdateFacilitiesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRoommatePreferencesDto)
  roommatePreferences?: UpdateRoommatePreferencesDto;

  @IsOptional()
  @IsEnum(['available', 'filled', 'pending'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  adminApprovalStatus?: string;
}
