import { IsString, IsNumber, IsEmail, IsOptional, Min, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from './payment.entity';


export class CreatePaymentDto {
  @ApiProperty({ example: 'ORDER_12345' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 100.50 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @ApiProperty({ example: 'customer_123' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ example: 'https://your-domain.com/payment/success' })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({ example: {} })
  @IsObject()
  @IsOptional()
  metadata?: object;
}

export class RefundPaymentDto {
  @ApiProperty({ example: 50.25 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 'Customer requested refund' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class PaymentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty()
  gatewayTransactionId?: string;

  @ApiProperty()
  paymentUrl?: string;
}