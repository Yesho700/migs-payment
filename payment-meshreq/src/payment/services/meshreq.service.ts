import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

interface MashreqAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MashreqPaymentResponse {
  transaction_id: string;
  status: string;
  redirect_url?: string;
  message?: string;
}

@Injectable()
export class MashreqService {
  private readonly logger = new Logger(MashreqService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('MASHREQ_BASE_URL')}/auth/token`,
          {
            grant_type: 'client_credentials',
            client_id: this.configService.get('MASHREQ_CLIENT_ID'),
            client_secret: this.configService.get('MASHREQ_CLIENT_SECRET'),
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const authData: MashreqAuthResponse = response.data;
      this.accessToken = authData.access_token;
      this.tokenExpiry = new Date(Date.now() + (authData.expires_in - 10) * 1000);

      this.logger.log('Successfully obtained access token from Mashreq');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to obtain access token from Mashreq', error);
      throw new HttpException(
        'Failed to authenticate with payment gateway',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async initiateCardPayment(data: {
    order_id: string;
    amount: number;
    currency: string;
    customer_email?: string;
    callback_url: string;
  }): Promise<MashreqPaymentResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('MASHREQ_BASE_URL')}/payments/initiate`,
          {
            merchant_order_id: data.order_id,
            amount: data.amount,
            currency: data.currency,
            customer_email: data.customer_email,
            callback_url: data.callback_url,
            webhook_url: `${this.configService.get('APP_URL')}/webhooks/mashreq`,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Card payment initiated for order: ${data.order_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to initiate card payment for order: ${data.order_id}`, error);
      throw new HttpException(
        'Failed to initiate payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processUtilityBill(data: {
    order_id: string;
    biller_code: string;
    account_number: string;
    amount: number;
    currency: string;
  }): Promise<MashreqPaymentResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('MASHREQ_BASE_URL')}/bills/pay`,
          {
            merchant_order_id: data.order_id,
            biller_code: data.biller_code,
            account_number: data.account_number,
            amount: data.amount,
            currency: data.currency,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Utility bill payment processed for order: ${data.order_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process utility bill for order: ${data.order_id}`, error);
      throw new HttpException(
        'Failed to process utility bill payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processFundTransfer(data: {
    order_id: string;
    recipient_account: string;
    recipient_name: string;
    recipient_bank: string;
    amount: number;
    currency: string;
    purpose: string;
  }): Promise<MashreqPaymentResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('MASHREQ_BASE_URL')}/transfers/initiate`,
          {
            merchant_order_id: data.order_id,
            recipient_account: data.recipient_account,
            recipient_name: data.recipient_name,
            recipient_bank: data.recipient_bank,
            amount: data.amount,
            currency: data.currency,
            purpose: data.purpose,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Fund transfer initiated for order: ${data.order_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to initiate fund transfer for order: ${data.order_id}`, error);
      throw new HttpException(
        'Failed to initiate fund transfer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processWalletPayment(data: {
    order_id: string;
    payment_token: string;
    amount: number;
    currency: string;
    wallet_type: string;
  }): Promise<MashreqPaymentResponse> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('MASHREQ_BASE_URL')}/wallets/pay`,
          {
            merchant_order_id: data.order_id,
            payment_token: data.payment_token,
            amount: data.amount,
            currency: data.currency,
            wallet_type: data.wallet_type,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Wallet payment processed for order: ${data.order_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to process wallet payment for order: ${data.order_id}`, error);
      throw new HttpException(
        'Failed to process wallet payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get('MASHREQ_WEBHOOK_SECRET');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}