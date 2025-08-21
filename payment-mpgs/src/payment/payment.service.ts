import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus, TransactionType } from './payment.entity';
import { MpgsService } from './mpgs.service';
import { CreatePaymentDto, PaymentResponseDto, RefundPaymentDto } from './payment.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment)
    private paymentModel: typeof Payment,
    private mpgsService: MpgsService,
    private configService: ConfigService,
  ) {}

  async createPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const transactionId = `TXN_${uuidv4()}`;
    
    try {
      // Create payment record
      const payment = await this.paymentModel.create({
        orderId: createPaymentDto.orderId,
        transactionId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'USD',
        customerId: createPaymentDto.customerId || '',
        customerEmail: createPaymentDto.customerEmail || '',
        metadata: createPaymentDto.metadata || {"hello":"payment"},
        status: PaymentStatus.PENDING,
        type: TransactionType.PAYMENT,
      });

      // Create MPGS session
      const sessionData = {
        orderId: createPaymentDto.orderId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'USD',
        returnUrl: createPaymentDto.returnUrl,
        interaction: {
          operation: 'PURCHASE',
          merchant: {
            name: this.configService.get<string>('MERCHANT_NAME', 'Your Store'),
            url: this.configService.get<string>('MERCHANT_URL', 'https://your-domain.com'),
          },
        },
      };

      const mpgsResponse = await this.mpgsService.createSession(sessionData);

      // Update payment with gateway response
      await payment.update({
        gatewayResponse: mpgsResponse,
      });

      this.logger.log(`Payment created successfully: ${transactionId}`);

      return {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentUrl: mpgsResponse.session ? 
          `${this.configService.get<string>('MPGS_GATEWAY_URL')}/checkout/version/${this.configService.get<string>('MPGS_VERSION', '70')}/checkout.js?session.id=${mpgsResponse.session.id}` : 
          undefined,
      };
    } catch (error) {
      this.logger.error(`Error creating payment: ${error.message}`);
      throw new BadRequestException('Failed to create payment');
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentModel.findOne({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    try {
      // Retrieve latest status from MPGS
      const mpgsResponse = await this.mpgsService.retrieveTransaction(
        transactionId,
        payment.orderId
      );

      // Update payment status based on MPGS response
      let newStatus = payment.status;
      if (mpgsResponse.result === 'SUCCESS') {
        newStatus = PaymentStatus.SUCCESS;
      } else if (mpgsResponse.result === 'FAILURE') {
        newStatus = PaymentStatus.FAILED;
      }

      await payment.update({
        status: newStatus,
        gatewayTransactionId: mpgsResponse.transaction?.id,
        gatewayResponse: mpgsResponse,
      });

      this.logger.log(`Payment status updated: ${transactionId} - ${newStatus}`);

      return {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: newStatus,
        gatewayTransactionId: payment.gatewayTransactionId,
      };
    } catch (error) {
      this.logger.error(`Error retrieving payment status: ${error.message}`);
      return {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        gatewayTransactionId: payment.gatewayTransactionId,
      };
    }
  }

  async refundPayment(transactionId: string, refundDto: RefundPaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.paymentModel.findOne({
      where: { 
        transactionId,
        status: PaymentStatus.SUCCESS,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found or cannot be refunded');
    }

    const refundAmount = refundDto.amount || payment.amount;
    const currentRefundedAmount = payment.refundedAmount || 0;

    if (currentRefundedAmount + refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    try {
      // Process refund through MPGS
      const mpgsResponse = await this.mpgsService.refundTransaction(
        payment.gatewayTransactionId || transactionId,
        payment.orderId,
        refundAmount
      );

      const newRefundedAmount = currentRefundedAmount + refundAmount;
      const newStatus = newRefundedAmount === payment.amount ? 
        PaymentStatus.REFUNDED : 
        PaymentStatus.PARTIALLY_REFUNDED;

      // Update payment record
      await payment.update({
        status: newStatus,
        refundedAmount: newRefundedAmount,
        refundTransactionId: mpgsResponse.transaction?.id,
        gatewayResponse: {
          ...payment.gatewayResponse,
          refund: mpgsResponse,
        },
      });

      this.logger.log(`Refund processed: ${transactionId} - Amount: ${refundAmount}`);

      return {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: newStatus,
        gatewayTransactionId: payment.gatewayTransactionId,
      };
    } catch (error) {
      this.logger.error(`Error processing refund: ${error.message}`);
      throw new BadRequestException('Failed to process refund');
    }
  }

  async cancelPayment(transactionId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentModel.findOne({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Cannot cancel a successful payment. Use refund instead.');
    }

    try {
      if (payment.gatewayTransactionId && payment.status === PaymentStatus.PENDING) {
        // Void the transaction if it exists and is pending
        await this.mpgsService.voidTransaction(
          payment.gatewayTransactionId,
          payment.orderId
        );
      }

      // Update payment status
      await payment.update({
        status: PaymentStatus.CANCELLED,
      });

      this.logger.log(`Payment cancelled: ${transactionId}`);

      return {
        id: payment.id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: PaymentStatus.CANCELLED,
        gatewayTransactionId: payment.gatewayTransactionId,
      };
    } catch (error) {
      this.logger.error(`Error cancelling payment: ${error.message}`);
      throw new BadRequestException('Failed to cancel payment');
    }
  }

  async getPaymentsByOrderId(orderId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentModel.findAll({
      where: { orderId },
      order: [['createdAt', 'DESC']],
    });

    return payments.map(payment => ({
      id: payment.id,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gatewayTransactionId: payment.gatewayTransactionId,
    }));
  }

  async getPaymentHistory(customerId: string): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentModel.findAll({
      where: { customerId },
      order: [['createdAt', 'DESC']],
    });

    return payments.map(payment => ({
      id: payment.id,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gatewayTransactionId: payment.gatewayTransactionId,
    }));
  }
}