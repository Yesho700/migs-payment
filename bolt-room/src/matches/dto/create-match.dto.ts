import { 
  IsString, 
  IsNumber, 
  IsObject, 
  IsOptional,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';

class ScoreBreakdownDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  genderMatch: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  foodMatch: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  smokingMatch: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  occupationMatch: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  ageMatch: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  locationMatch: number;
}

export class CreateMatchDto {
  @IsString()
  provider: string;

  @IsString()
  listing: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  compatibilityScore?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoreBreakdownDto)
  scoreBreakdown?: ScoreBreakdownDto;
}