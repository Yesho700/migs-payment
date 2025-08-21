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

class LocationDto {
  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;
}

class CoordinatesDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

class FacilitiesDto {
  @IsBoolean()
  wifi: boolean;

  @IsBoolean()
  ac: boolean;

  @IsBoolean()
  laundry: boolean;

  @IsBoolean()
  parking: boolean;

  @IsBoolean()
  food: boolean;

  @IsBoolean()
  gym: boolean;

  @IsBoolean()
  powerBackup: boolean;
}

class AgeRangeDto {
  @IsNumber()
  @Min(16)
  @Max(80)
  min: number;

  @IsNumber()
  @Min(16)
  @Max(80)
  max: number;
}

class RoommatePreferencesDto {
  @IsEnum(['male', 'female', 'any'])
  gender: 'male' | 'female' | 'any';

  @IsEnum(['vegetarian', 'non-vegetarian', 'any'])
  foodPreference: 'vegetarian' | 'non-vegetarian' | 'any';

  @IsEnum(['smoker', 'non-smoker', 'any'])
  smokingPreference: 'smoker' | 'non-smoker' | 'any';

  @IsEnum(['student', 'working', 'any'])
  occupation: 'student' | 'working' | 'any';

  @ValidateNested()
  @Type(() => AgeRangeDto)
  ageRange: AgeRangeDto;
}

export class CreateListingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  rentAmount: number;

  @IsNumber()
  @Min(0)
  deposit: number;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FacilitiesDto)
  facilities?: FacilitiesDto;

  @ValidateNested()
  @Type(() => RoommatePreferencesDto)
  roommatePreferences: RoommatePreferencesDto;
}