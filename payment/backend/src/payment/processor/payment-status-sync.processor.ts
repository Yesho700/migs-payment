import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import PaymentTransaction, { TransactionStatus } from '../models/payment-transaction.model';
import { PaymentService } from '../payment.service';
import { SyncError } from '../interfaces/payment.interface';

@Injectable()
@Processor('payment-status-sync')
export class PaymentStatusSyncProcessor {
  private readonly logger = new Logger(PaymentStatusSyncProcessor.name);

  constructor(
    @InjectModel(PaymentTransaction)
    private readonly paymentModel: typeof PaymentTransaction,
    private readonly paymentService: PaymentService,
  ) {}

  @Process('sync-pending-payments')
  async handlePaymentStatusSync(job: Job<any>): Promise<any> {
    const startTime = Date.now();
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: SyncError[] = [];
    

    try {
      this.logger.log('Starting payment status synchronization', {
        jobId: job.id,
        triggeredBy: job.data.triggeredBy || 'scheduled',
      });

      // Fetch pending transactions older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const batchSize = job.data.batchSize || 50;

      const pendingTransactions = await this.paymentModel.findAll({
        where: {
          status: TransactionStatus.PENDING,
          createdAt: {
            [Op.lt]: fiveMinutesAgo,
          },
        },
        limit: batchSize,
        order: [['createdAt', 'ASC']],
      });

      this.logger.log(`Found ${pendingTransactions.length} pending transactions to sync`);

      for (const transaction of pendingTransactions) {
        try {
          processedCount++;

          // Update job progress
          await job.progress((processedCount / pendingTransactions.length) * 100);

          // Query gateway for current status
          const gatewayResponse = await this.paymentService.queryPaymentByTxnRef(
            transaction.merchantTxnRef
          );

          // Check if status has changed
          const gatewayStatus = this.mapGatewayStatusToLocal(
            gatewayResponse.vpc_TxnResponseCode
          );

          if (gatewayStatus && gatewayStatus !== transaction.status) {
            // Update transaction status
            await transaction.update({
              status: gatewayStatus,
              responseCode: gatewayResponse.vpc_TxnResponseCode,
              responseMessage: gatewayResponse.vpc_Message,
              transactionId: gatewayResponse.vpc_TransactionNo,
              authCode: gatewayResponse.vpc_AuthorizeId,
              receiptNo: gatewayResponse.vpc_ReceiptNo,
              processedAt: new Date(),
            });

            updatedCount++;

            this.logger.log('Transaction status updated', {
              merchantTxnRef: transaction.merchantTxnRef,
              oldStatus: transaction.status,
              newStatus: gatewayStatus,
            });
          } else {
            skippedCount++;
          }

          // Small delay to prevent overwhelming the gateway
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          errorCount++;
          const errorDetail: SyncError = {
            merchantTxnRef: transaction.merchantTxnRef,
            error: error.message,
            retryable: this.isRetryableError(error),
          };
          errors.push(errorDetail);

          this.logger.error('Failed to sync transaction status', {
            merchantTxnRef: transaction.merchantTxnRef,
            error: error.message,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      const result = {
        processedCount,
        updatedCount,
        errorCount,
        skippedCount,
        processingTime,
        errors,
      };

      this.logger.log('Payment status synchronization completed', result);

      return result;

    } catch (error) {
      this.logger.error('Payment status synchronization failed', {
        error: error.message,
        stack: error.stack,
        jobId: job.id,
      });
      throw error;
    }
  }

  private mapGatewayStatusToLocal(responseCode: string): string | null {
    switch (responseCode) {
      case '0':
        return TransactionStatus.SUCCESS;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
        return TransactionStatus.FAILED;
      default:
        return null; // Unknown status, don't update
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and temporary gateway errors are retryable
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('timeout') ||
           error.status >= 500;
  }
}
