import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { InitiateCardPaymentDto, InitiateFundTransferDto, InitiateUtilityBillDto, InitiateWalletPaymentDto } from '../dtos/initiate-payment.dto';


@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('card/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateCardPayment(@Body() data: InitiateCardPaymentDto) {
    this.logger.log(`Initiating card payment for order: ${data.order_id}`);
    return this.paymentService.initiateCardPayment(data);
  }

  @Post('bills/pay')
  @HttpCode(HttpStatus.OK)
  async payUtilityBill(@Body() data: InitiateUtilityBillDto) {
    this.logger.log(`Processing utility bill payment for order: ${data.order_id}`);
    return this.paymentService.processUtilityBill(data);
  }

  @Post('transfers/initiate')
  @HttpCode(HttpStatus.OK)
  async initiateFundTransfer(@Body() data: InitiateFundTransferDto) {
    this.logger.log(`Initiating fund transfer for order: ${data.order_id}`);
    return this.paymentService.processFundTransfer(data);
  }

  @Post('wallets/pay')
  @HttpCode(HttpStatus.OK)
  async processWalletPayment(@Body() data: InitiateWalletPaymentDto) {
    this.logger.log(`Processing ${data.wallet_type} payment for order: ${data.order_id}`);
    return this.paymentService.processWalletPayment(data);
  }

  @Get('status/:transactionId')
  async getTransactionStatus(@Param('transactionId') transactionId: string) {
    return this.paymentService.getTransactionStatus(transactionId);
  }

  @Get('callback/:transactionId')
  async handleCallback(@Param('transactionId') transactionId: string) {
    // Redirect user to frontend with transaction ID
    // Frontend will call /payments/status/:transactionId to get final status
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return {
      redirect_url: `${appUrl}/payment/result?transaction_id=${transactionId}`,
    };
  }
}