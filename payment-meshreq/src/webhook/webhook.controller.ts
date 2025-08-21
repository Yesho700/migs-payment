import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/sequelize';

import { TransactionStatus } from '../database/models/transaction.model';
import { WebhookLog } from 'src/database/models/webhook-logs.model';
import { PaymentService } from 'src/payment/services/payment.service';
import { MashreqService } from 'src/payment/services/meshreq.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly mashreqService: MashreqService,
    @InjectModel(WebhookLog)
    private readonly webhookLogModel: typeof WebhookLog,
  ) {}

  @Post('mashreq')
  @HttpCode(HttpStatus.OK)
  async handleMashreqWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-mashreq-signature') signature: string,
    @Body() payload: any,
  ) {

    let rawBody = req.rawBody;

  // Ensure rawBody is not undefined before proceeding
    if (!rawBody) {
        this.logger.error('Missing raw body');
        return { status: 'error', message: 'Missing raw body' };
    }

    const rawBodys = rawBody.toString();
    
    // Verify webhook signature
    if (!this.mashreqService.verifyWebhookSignature(rawBodys, signature)) {
      this.logger.error('Invalid webhook signature received');
      return { status: 'error', message: 'Invalid signature' };
    }

    // Log webhook for audit purposes
    await this.webhookLogModel.create({
      transaction_id: payload.transaction_id,
      payload: payload,
      signature: signature,
      processed: false,
    });

    this.logger.log(`Processing webhook for transaction: ${payload.transaction_id}`);

    try {
      // Map Mashreq status to our internal status
      let internalStatus: TransactionStatus;
      switch (payload.status) {
        case 'payment.succeeded':
        case 'transfer.completed':
        case 'bill.paid':
          internalStatus = TransactionStatus.SUCCESS;
          break;
        case 'payment.failed':
        case 'transfer.failed':
        case 'bill.failed':
          internalStatus = TransactionStatus.FAILED;
          break;
        case 'payment.cancelled':
          internalStatus = TransactionStatus.CANCELLED;
          break;
        case 'payment.refunded':
          internalStatus = TransactionStatus.REFUNDED;
          break;
        default:
          internalStatus = TransactionStatus.PENDING;
      }

      // Update transaction status
      await this.paymentService.updateTransactionStatus(
        payload.transaction_id,
        internalStatus,
        payload,
      );

      // Mark webhook as processed
      await this.webhookLogModel.update(
        { processed: true },
        { where: { transaction_id: payload.transaction_id } },
      );

      this.logger.log(`Webhook processed successfully for transaction: ${payload.transaction_id}`);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error processing webhook for transaction: ${payload.transaction_id}`, error);
      return { status: 'error', message: 'Processing failed' };
    }
  }
}