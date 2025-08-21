import PaymentTransaction from "../models/payment-transaction.model";

/**
 * VPC Payment Request Interface
 * Defines the structure for MIGS VPC payment requests
 */
export interface VpcPaymentRequest {
  vpc_Version: string;
  vpc_Command: string;
  vpc_AccessCode: string;
  vpc_MerchTxnRef: string;
  vpc_Merchant: string;
  vpc_OrderInfo: string;
  vpc_Amount: string;
  vpc_ReturnURL: string;
  vpc_Locale: string;
}


/**
 * MIGS Configuration Interface
 * Defines the required configuration parameters for MIGS integration
 */
export interface MigsConfiguration {
  merchantId: string;
  accessCode: string;
  secureSecret: string;
  gatewayUrl: string;
  currency: string;
  returnUrl: string;
  gatewayQueryUrl: string;
}

/**
 * Payment Creation Response Interface
 * Defines the structure for payment creation response
 */
export interface PaymentCreationResponse {
  paymentUrl: string;
  transaction: PaymentTransaction;
}


/**
 * Payment Response Interface
 * Defines the structure for API responses
 */
export interface PaymentApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Payment Status Data Interface
 * Defines the structure for payment status response data
 */
export interface PaymentStatusData {
  paymentId: string;
  merchantTxnRef: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: string;
  responseCode?: string;
  responseMessage?: string;
  authCode?: string;
  receiptNo?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Payment Creation Data Interface
 * Defines the structure for payment creation response data
 */
export interface PaymentCreationData {
  paymentId: string;
  merchantTxnRef: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Refund Response Data Interface
 * Defines the structure for refund response data
 */
export interface RefundResponseData {
  paymentId: string;
  refundedAmount: number;
  status: string;
  totalAmount: number;
}

/**
 * Payment Cancellation Data Interface
 * Defines the structure for payment cancellation response data
 */
export interface PaymentCancellationData {
  paymentId: string;
  merchantTxnRef: string;
  status: string;
}

/**
 * Health Check Response Interface
 * Defines the structure for health check response
 */
export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  version?: string;
  environment?: string;
}


export interface SyncError {
  merchantTxnRef: string;
  error: string;
  retryable: boolean;
}

export interface SyncJobData {
  triggeredBy?: 'scheduled' | 'manual' | 'fallback-cron';
  timestamp?: string;
  batchSize?: number;
}

export interface SyncJobResult {
  processedCount: number;
  updatedCount: number;
  errorCount: number;
  skippedCount: number;
  processingTime: number;
  errors: SyncError[];
}