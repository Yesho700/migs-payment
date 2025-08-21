import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

export interface MPGSConfig {
  merchantId: string;
  apiUsername: string;
  apiPassword: string;
  gatewayUrl: string;
  version: string;
}

export interface CreateSessionRequest {
  orderId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
  interaction: {
    operation: string;
    merchant: {
      name: string;
      url: string;
    };
  };
}

export interface MPGSTransactionResponse {
  result: string;
  transaction: {
    id: string;
    amount: number;
    currency: string;
    type: string;
  };
  response: {
    gatewayCode: string;
  };
}

@Injectable()
export class MpgsService {
  private readonly logger = new Logger(MpgsService.name);
  private readonly config: MPGSConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      merchantId: this.configService.get<string>('MPGS_MERCHANT_ID') || '',
      apiUsername: this.configService.get<string>('MPGS_API_USERNAME') || '',
      apiPassword: this.configService.get<string>('MPGS_API_PASSWORD') || '',
      gatewayUrl: this.configService.get<string>('MPGS_GATEWAY_URL') || '',
      version: this.configService.get<string>('MPGS_VERSION', '70'),
    };
  }

  private getAuthHeader(): string {
    const credentials = `merchant.${this.config.merchantId}:${this.config.apiPassword}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private getApiUrl(endpoint: string): string {
    return `${this.config.gatewayUrl}/api/rest/version/${this.config.version}/merchant/${this.config.merchantId}${endpoint}`;
  }

  async createSession(data: CreateSessionRequest): Promise<any> {
    try {
      const url = this.getApiUrl('/session');
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      };

      const sessionData = {
        apiOperation: 'CREATE_CHECKOUT_SESSION',
        order: {
          id: data.orderId,
          amount: data.amount,
          currency: data.currency,
        },
        interaction: data.interaction,
      };

      if (data.returnUrl) {
        sessionData['returnUrl'] = data.returnUrl;
      }

      this.logger.debug(`Creating MPGS session for order: ${data.orderId}`);
      
      const response: AxiosResponse = await axios.post(url, sessionData, { headers });
      
      this.logger.debug(`MPGS session created successfully: ${response.data.session?.id}`);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error creating MPGS session:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to create payment session');
    }
  }

  async retrieveTransaction(transactionId: string, orderId: string): Promise<MPGSTransactionResponse> {
    try {
      const url = this.getApiUrl(`/order/${orderId}/transaction/${transactionId}`);
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      };

      this.logger.debug(`Retrieving MPGS transaction: ${transactionId}`);
      
      const response: AxiosResponse = await axios.get(url, { headers });
      
      this.logger.debug(`MPGS transaction retrieved successfully`);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error retrieving MPGS transaction:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to retrieve transaction');
    }
  }

  async refundTransaction(transactionId: string, orderId: string, amount?: number): Promise<any> {
    try {
      const refundTransactionId = `${transactionId}_refund_${Date.now()}`;
      const url = this.getApiUrl(`/order/${orderId}/transaction/${refundTransactionId}`);
      
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      };

      const refundData = {
        apiOperation: 'REFUND',
        transaction: {
          targetTransactionId: transactionId,
        },
      };

      if (amount) {
        refundData.transaction['amount'] = amount;
      }

      this.logger.debug(`Refunding MPGS transaction: ${transactionId}`);
      
      const response: AxiosResponse = await axios.put(url, refundData, { headers });
      
      this.logger.debug(`MPGS refund processed successfully`);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error processing MPGS refund:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  async voidTransaction(transactionId: string, orderId: string): Promise<any> {
    try {
      const voidTransactionId = `${transactionId}_void_${Date.now()}`;
      const url = this.getApiUrl(`/order/${orderId}/transaction/${voidTransactionId}`);
      
      const headers = {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      };

      const voidData = {
        apiOperation: 'VOID',
        transaction: {
          targetTransactionId: transactionId,
        },
      };

      this.logger.debug(`Voiding MPGS transaction: ${transactionId}`);
      
      const response: AxiosResponse = await axios.put(url, voidData, { headers });
      
      this.logger.debug(`MPGS void processed successfully`);
      
      return response.data;
    } catch (error) {
      this.logger.error('Error voiding MPGS transaction:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to void transaction');
    }
  }
}
