import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  Min,
} from 'class-validator';

export class InitiateCardPaymentDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'AED';

  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @IsOptional()
  @IsString()
  customer_id?: string;
}

export class InitiateUtilityBillDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  biller_code: string;

  @IsNotEmpty()
  @IsString()
  account_number: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'AED';

  @IsOptional()
  @IsString()
  customer_id?: string;
}

export class InitiateFundTransferDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  recipient_account: string;

  @IsNotEmpty()
  @IsString()
  recipient_name: string;

  @IsNotEmpty()
  @IsString()
  recipient_bank: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'AED';

  @IsNotEmpty()
  @IsString()
  purpose: string;

  @IsOptional()
  @IsString()
  customer_id?: string;
}

export class InitiateWalletPaymentDto {
  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  payment_token: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string = 'AED';

  @IsNotEmpty()
  @IsEnum(['apple_pay', 'samsung_pay'])
  wallet_type: 'apple_pay' | 'samsung_pay';

  @IsOptional()
  @IsString()
  customer_id?: string;
}