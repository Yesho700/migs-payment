import { IsString, IsNumber, IsOptional, IsEmail, IsUrl, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order information' })
  @IsString()
  orderInfo: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Currency code', default: 'AED' })
  @IsString()
  @IsOptional()
  currency?: string = 'AED';

  @ApiProperty({ description: 'Customer email', required: false })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ description: 'Customer phone', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({ description: 'Return URL', required: false })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Refund amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: 'Refund reason', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentResponseDto {
  vpc_TxnResponseCode: string;
  vpc_TransactionNo: string;
  vpc_MerchTxnRef: string;
  vpc_OrderInfo: string;
  vpc_Amount: string;
  vpc_Command: string;
  vpc_Version: string;
  vpc_SecureHash: string;
  vpc_Message: string;
  vpc_AuthorizeId?: string;
  vpc_ReceiptNo?: string;
  vpc_BatchNo?: string;
  [key: string]: any;
}
