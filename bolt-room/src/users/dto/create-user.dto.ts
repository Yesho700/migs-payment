import { IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsArray, IsObject } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsNumber()
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
  bio?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsArray()
  interests?: string[];

  @IsOptional()
  @IsObject()
  location?: {
    city: string;
    state: string;
    country: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
}