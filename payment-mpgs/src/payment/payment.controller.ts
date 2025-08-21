import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, PaymentResponseDto, RefundPaymentDto } from './payment.dto';


@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully',
    type: PaymentResponseDto,
  })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Creating payment for order: ${createPaymentDto.orderId}`);
    return this.paymentService.createPayment(createPaymentDto);
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Get payment status by transaction ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status retrieved successfully',
    type: PaymentResponseDto,
  })
  async getPaymentStatus(@Param('transactionId') transactionId: string): Promise<PaymentResponseDto> {
    this.logger.log(`Getting payment status for transaction: ${transactionId}`);
    return this.paymentService.getPaymentStatus(transactionId);
  }

  @Put('transaction/:transactionId/refund')
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment refunded successfully',
    type: PaymentResponseDto,
  })
  async refundPayment(
    @Param('transactionId') transactionId: string,
    @Body() refundDto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Refunding payment: ${transactionId}`);
    return this.paymentService.refundPayment(transactionId, refundDto);
  }

  @Put('transaction/:transactionId/cancel')
  @ApiOperation({ summary: 'Cancel a payment' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment cancelled successfully',
    type: PaymentResponseDto,
  })
  async cancelPayment(@Param('transactionId') transactionId: string): Promise<PaymentResponseDto> {
    this.logger.log(`Cancelling payment: ${transactionId}`);
    return this.paymentService.cancelPayment(transactionId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getPaymentsByOrderId(@Param('orderId') orderId: string): Promise<PaymentResponseDto[]> {
    this.logger.log(`Getting payments for order: ${orderId}`);
    return this.paymentService.getPaymentsByOrderId(orderId);
  }

  @Get('customer/:customerId/history')
  @ApiOperation({ summary: 'Get payment history for a customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history retrieved successfully',
    type: [PaymentResponseDto],
  })
  async getPaymentHistory(@Param('customerId') customerId: string): Promise<PaymentResponseDto[]> {
    this.logger.log(`Getting payment history for customer: ${customerId}`);
    return this.paymentService.getPaymentHistory(customerId);
  }
}