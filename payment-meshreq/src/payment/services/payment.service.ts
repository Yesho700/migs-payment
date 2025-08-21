import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { ConfigService } from '@nestjs/config';
import { MashreqService } from './meshreq.service';
import { Transaction, TransactionStatus, TransactionType } from 'src/database/models/transaction.model';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Transaction)
    private readonly transactionModel: typeof Transaction,
    private readonly mashreqService: MashreqService,
    private readonly configService: ConfigService,
  ) {}

  async initiateCardPayment(data: any) {
    // Create transaction record
    const transaction = await this.transactionModel.create({
      order_id: data.order_id,
      type: TransactionType.CARD_PAYMENT,
      status: TransactionStatus.PENDING,
      amount: data.amount,
      currency: data.currency || 'AED',
      customer_email: data.customer_email,
      customer_id: data.customer_id,
    });

    try {
      const mashreqResponse = await this.mashreqService.initiateCardPayment({
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency || 'AED',
        customer_email: data.customer_email,
        callback_url: `${this.configService.get('APP_URL')}/payments/callback/${transaction.id}`,
      });

      await transaction.update({
        mashreq_transaction_id: mashreqResponse.transaction_id,
        redirect_url: mashreqResponse.redirect_url,
        mashreq_response: mashreqResponse,
        status: TransactionStatus.PROCESSING,
      });

      return {
        transaction_id: transaction.id,
        redirect_url: mashreqResponse.redirect_url,
        status: 'processing',
      };
    } catch (error) {
      await transaction.update({
        status: TransactionStatus.FAILED,
        failure_reason: error.message,
      });
      throw error;
    }
  }

  async processUtilityBill(data: any) {
    const transaction = await this.transactionModel.create({
      order_id: data.order_id,
      type: TransactionType.UTILITY_BILL,
      status: TransactionStatus.PENDING,
      amount: data.amount,
      currency: data.currency || 'AED',
      customer_id: data.customer_id,
      payment_details: {
        biller_code: data.biller_code,
        account_number: data.account_number,
      },
    });

    try {
      const mashreqResponse = await this.mashreqService.processUtilityBill({
        order_id: data.order_id,
        biller_code: data.biller_code,
        account_number: data.account_number,
        amount: data.amount,
        currency: data.currency || 'AED',
      });

      const finalStatus = mashreqResponse.status === 'success' 
        ? TransactionStatus.SUCCESS 
        : TransactionStatus.FAILED;

      await transaction.update({
        mashreq_transaction_id: mashreqResponse.transaction_id,
        status: finalStatus,
        mashreq_response: mashreqResponse,
        failure_reason: mashreqResponse.status === 'failed' ? mashreqResponse.message : null,
      });

      return {
        transaction_id: transaction.id,
        status: finalStatus,
        mashreq_transaction_id: mashreqResponse.transaction_id,
      };
    } catch (error) {
      await transaction.update({
        status: TransactionStatus.FAILED,
        failure_reason: error.message,
      });
      throw error;
    }
  }

  async processFundTransfer(data: any) {
    const transaction = await this.transactionModel.create({
      order_id: data.order_id,
      type: TransactionType.FUND_TRANSFER,
      status: TransactionStatus.PENDING,
      amount: data.amount,
      currency: data.currency || 'AED',
      customer_id: data.customer_id,
      payment_details: {
        recipient_account: data.recipient_account,
        recipient_name: data.recipient_name,
        recipient_bank: data.recipient_bank,
        purpose: data.purpose,
      },
    });

    try {
      const mashreqResponse = await this.mashreqService.processFundTransfer({
        order_id: data.order_id,
        recipient_account: data.recipient_account,
        recipient_name: data.recipient_name,
        recipient_bank: data.recipient_bank,
        amount: data.amount,
        currency: data.currency || 'AED',
        purpose: data.purpose,
      });

      const finalStatus = mashreqResponse.status === 'success' 
        ? TransactionStatus.SUCCESS 
        : TransactionStatus.FAILED;

      await transaction.update({
        mashreq_transaction_id: mashreqResponse.transaction_id,
        status: finalStatus,
        mashreq_response: mashreqResponse,
        failure_reason: mashreqResponse.status === 'failed' ? mashreqResponse.message : null,
      });

      return {
        transaction_id: transaction.id,
        status: finalStatus,
        mashreq_transaction_id: mashreqResponse.transaction_id,
      };
    } catch (error) {
      await transaction.update({
        status: TransactionStatus.FAILED,
        failure_reason: error.message,
      });
      throw error;
    }
  }

  async processWalletPayment(data: any) {
    const walletType = data.wallet_type === 'apple_pay' 
      ? TransactionType.APPLE_PAY 
      : TransactionType.SAMSUNG_PAY;

    const transaction = await this.transactionModel.create({
      order_id: data.order_id,
      type: walletType,
      status: TransactionStatus.PENDING,
      amount: data.amount,
      currency: data.currency || 'AED',
      customer_id: data.customer_id,
      payment_details: {
        wallet_type: data.wallet_type,
      },
    });

    try {
      const mashreqResponse = await this.mashreqService.processWalletPayment({
        order_id: data.order_id,
        payment_token: data.payment_token,
        amount: data.amount,
        currency: data.currency || 'AED',
        wallet_type: data.wallet_type,
      });

      const finalStatus = mashreqResponse.status === 'success' 
        ? TransactionStatus.SUCCESS 
        : TransactionStatus.FAILED;

      await transaction.update({
        mashreq_transaction_id: mashreqResponse.transaction_id,
        status: finalStatus,
        mashreq_response: mashreqResponse,
        failure_reason: mashreqResponse.status === 'failed' ? mashreqResponse.message : null,
      });

      return {
        transaction_id: transaction.id,
        status: finalStatus,
        mashreq_transaction_id: mashreqResponse.transaction_id,
      };
    } catch (error) {
      await transaction.update({
        status: TransactionStatus.FAILED,
        failure_reason: error.message,
      });
      throw error;
    }
  }

  async getTransactionStatus(transactionId: string) {
    const transaction = await this.transactionModel.findByPk(transactionId);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      transaction_id: transaction.id,
      order_id: transaction.order_id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    };
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    webhookData?: any,
  ) {
    const transaction = await this.transactionModel.findOne({
      where: { mashreq_transaction_id: transactionId },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for Mashreq ID: ${transactionId}`);
      return null;
    }

    await transaction.update({
      status,
      mashreq_response: webhookData || transaction.mashreq_response,
    });

    this.logger.log(`Transaction ${transaction.id} status updated to ${status}`);
    return transaction;
  }
}