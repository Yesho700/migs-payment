

import { Injectable, Logger, BadRequestException, NotFoundException, Res, ServiceUnavailableException, GatewayTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import PaymentTransaction, { TransactionStatus } from './models/payment-transaction.model';
import { CreatePaymentDto, RefundPaymentDto, PaymentResponseDto } from './dto/payment.dto';
import { MigsHashUtil, VpcSecureHashType } from './utils/hash.util';
import { MigsConfiguration, PaymentCreationResponse } from './interfaces/payment.interface';


/**
 * PaymentService
 * 
 * A comprehensive payment service that handles MIGS (MasterCard Internet Gateway Service) 
 * payment processing including payment creation, response handling, refunds, and cancellations.
 * 
 * @class PaymentService
 * @version 1.0.0
 * @author Payment Team
 * @since 2024
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly config: MigsConfiguration;
  private readonly vpcSecureAlgo = VpcSecureHashType.SHA256;

  /**
   * PaymentService Constructor
   * Initializes the payment service with configuration and validates MIGS settings
   * 
   * @param configService - NestJS configuration service
   * @param sequelize - Sequelize database connection
   * @param paymentModel - Payment transaction model
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly sequelize: Sequelize,
    @InjectModel(PaymentTransaction)
    private readonly paymentModel: typeof PaymentTransaction,
  ) {
    this.config = {
      merchantId: this.configService.get<string>('MIGS_MERCHANT_ID')!,
      accessCode: this.configService.get<string>('MIGS_ACCESS_CODE')!,
      secureSecret: this.configService.get<string>('MIGS_SECURE_SECRET')!,
      gatewayUrl: this.configService.get<string>('MIGS_GATEWAY_URL')!,
      currency: this.configService.get<string>('MIGS_CURRENCY')!,
      returnUrl: this.configService.get<string>('MIGS_RETURN_URL')!,
      gatewayQueryUrl: this.configService.get<string>('MIGS_GATEWAY_QUERY_URL')!
    };


    this.validateMigsConfiguration();
  }

  /**
   * Validates MIGS configuration parameters
   * Ensures all required configuration fields are present and properly formatted
   * 
   * @private
   * @throws {Error} If any required configuration is missing
   */
  private validateMigsConfiguration(): void {
    const requiredFields = ['merchantId', 'accessCode', 'secureSecret', 'gatewayUrl', 'returnUrl'];

    for (const field of requiredFields) {
      if (!this.config[field]) {
        throw new Error(`MIGS configuration missing: ${field.toUpperCase()}`);
      }
    }

    // Validate secure secret format (should be hexadecimal)
    if (!/^[0-9A-Fa-f]+$/.test(this.config.secureSecret)) {
      this.logger.warn('Secure secret might not be in hexadecimal format');
    }

    this.logger.log('MIGS configuration validated successfully', {
      merchantId: this.config.merchantId,
      accessCode: `${this.config.accessCode.substring(0, 4)}****`,
      hasSecureSecret: !!this.config.secureSecret,
      gatewayUrl: this.config.gatewayUrl,
    });
  }

  /**
   * Creates a new payment transaction and generates payment URL
   * 
   * @param paymentData - Payment creation data transfer object
   * @param clientIp - Optional client IP address for audit purposes
   * @returns Promise resolving to payment URL and transaction record
   * @throws {Error} If payment creation fails
   */
  async createPayment(
    paymentData: CreatePaymentDto,
    clientIp?: string
  ): Promise<PaymentCreationResponse> {
    const transaction = await this.sequelize.transaction();

    try {
      const merchantTxnRef = this.generateTxnRef();

      // Create transaction record in database
      const paymentTransaction = await this.paymentModel.create({
        merchantTxnRef,
        orderInfo: paymentData.orderInfo,
        amount: paymentData.amount,
        currency: paymentData.currency || this.config.currency,
        customerEmail: paymentData.customerEmail,
        customerPhone: paymentData.customerPhone,
        returnUrl: paymentData.returnUrl || this.config.returnUrl,
        clientIp,
        status: TransactionStatus.PENDING,
      }, { transaction });

      // Prepare VPC data for MIGS gateway
      const vpcData: Record<string, string> = {
        vpc_Version: '1',
        vpc_Command: 'pay',
        vpc_AccessCode: this.config.accessCode,
        vpc_MerchTxnRef: merchantTxnRef,
        vpc_Merchant: this.config.merchantId,
        vpc_OrderInfo: paymentData.orderInfo,
        vpc_Amount: (paymentData.amount * 100).toString(), // Convert to cents
        vpc_ReturnURL: this.config.returnUrl,
        vpc_Locale: 'en',
        vpc_Gateway: 'ssl'
      };

      // Generate secure hash for data integrity
      const secureHash = MigsHashUtil.generateSecureHash(
        vpcData,
        this.config.secureSecret,
        this.vpcSecureAlgo
      );
      vpcData.vpc_SecureHash = secureHash;
      vpcData.vpc_SecureHashType = this.vpcSecureAlgo;



      // Store VPC data for audit trail
      await paymentTransaction.update({ vpcData }, { transaction });

      await transaction.commit();

      const paymentUrl = this.buildPaymentUrl(vpcData);

      return { paymentUrl, transaction: paymentTransaction };
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Error creating payment', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Processes payment response from MIGS gateway
   * Validates secure hash and updates transaction status
   * 
   * @param responseData - Payment response data from MIGS
   * @returns Promise resolving to updated payment transaction
   * @throws {BadRequestException} If secure hash validation fails
   * @throws {NotFoundException} If transaction is not found
   */
  async processPaymentResponse(responseData: PaymentResponseDto): Promise<PaymentTransaction> {
    const transaction = await this.sequelize.transaction();
    console.log(responseData)
    try {
      // Verify secure hash for response integrity
      const isValidHash = MigsHashUtil.verifySecureHash(
        responseData,
        this.config.secureSecret,
        this.vpcSecureAlgo
      );

      if (!isValidHash) {
        throw new BadRequestException('Invalid secure hash - response integrity compromised');
      }

      // Locate the corresponding transaction
      const paymentTransaction = await this.paymentModel.findOne({
        where: { merchantTxnRef: responseData.vpc_MerchTxnRef },
        transaction,
      });

      if (!paymentTransaction) {
        throw new NotFoundException(`Transaction not found: ${responseData.vpc_MerchTxnRef}`);
      }

      // Determine transaction status based on response code
      const transactionStatus = responseData.vpc_TxnResponseCode === '0'
        ? TransactionStatus.SUCCESS
        : TransactionStatus.FAILED;

      // Update transaction with gateway response
      const updateData = {
        transactionId: responseData.vpc_TransactionNo,
        responseCode: responseData.vpc_TxnResponseCode,
        responseMessage: responseData.vpc_Message,
        authCode: responseData.vpc_AuthorizeId,
        receiptNo: responseData.vpc_ReceiptNo,
        batchNo: responseData.vpc_BatchNo,
        gatewayResponse: responseData,
        processedAt: new Date(),
        status: transactionStatus,
      };

      await paymentTransaction.update(updateData, { transaction });
      await transaction.commit();

      return paymentTransaction.reload();
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Error processing payment response', {
        error: error.message,
        merchantTxnRef: responseData.vpc_MerchTxnRef
      });
      throw error;
    }
  }

  /**
   * Cancels a pending payment transaction
   * 
   * @param paymentId - ID of the payment to cancel
   * @returns Promise resolving to updated payment transaction
   * @throws {NotFoundException} If payment is not found
   * @throws {BadRequestException} If payment cannot be cancelled
   */
  async cancelPayment(paymentId: string): Promise<PaymentTransaction> {
    const transaction = await this.sequelize.transaction();

    try {
      const paymentTransaction = await this.paymentModel.findByPk(paymentId, { transaction });

      if (!paymentTransaction) {
        throw new NotFoundException(`Payment not found: ${paymentId}`);
      }

      if (paymentTransaction.dataValues.status !== TransactionStatus.PENDING) {
        throw new BadRequestException(
          `Payment cannot be cancelled - current status: ${paymentTransaction.dataValues.status}`
        );
      }

      await paymentTransaction.update({
        status: TransactionStatus.CANCELLED,
        processedAt: new Date(),
      }, { transaction });

      await transaction.commit();

      this.logger.log('Payment cancelled successfully', { paymentId });

      return paymentTransaction.reload();
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Error cancelling payment', { error: error.message, paymentId });
      throw error;
    }
  }

  /**
   * Processes a payment refund through MIGS gateway
   * Supports both partial and full refunds
   * 
   * @param refundData - Refund request data
   * @param res - Express response object for HTML responses
   * @returns Promise resolving to updated payment transaction
   * @throws {NotFoundException} If payment is not found
   * @throws {BadRequestException} If refund conditions are not met
   */
  async refundPayment(refundData: RefundPaymentDto): Promise<PaymentTransaction> {

    const transaction = await this.sequelize.transaction();

    try {
      const paymentTransaction = await this.paymentModel.findByPk(refundData.paymentId, { transaction });

      if (!paymentTransaction) {
        throw new NotFoundException(`Payment not found: ${refundData.paymentId}`);
      }

      const { dataValues } = paymentTransaction;
     
      if (dataValues.status !== TransactionStatus.SUCCESS) {
        throw new BadRequestException(
          `Payment not eligible for refund - current status: ${dataValues.status}`
        );
      }

      const availableAmount = Number(dataValues.amount) - Number(dataValues.refundedAmount);

      if (refundData.amount > availableAmount) {
        throw new BadRequestException(
          `Refund amount (${refundData.amount}) exceeds available amount (${availableAmount})`
        );

      }

      // Prepare refund request for MIGS
      const refundTxnRef = this.generateRefundTxnRef();
      const vpcData = {
        vpc_Version: '1',
        vpc_Command: 'refund',
        vpc_AccessCode: this.config.accessCode,
        vpc_MerchTxnRef: refundTxnRef,
        vpc_Merchant: this.config.merchantId,
        vpc_TransactionNo: dataValues.transactionId,
        vpc_TransNo: dataValues.transactionId,
        vpc_Amount: (refundData.amount * 100).toString(),
      };

      const secureHash = MigsHashUtil.generateSecureHash(
        vpcData,
        this.config.secureSecret,
        this.vpcSecureAlgo
      );
      vpcData["vpc_SecureHash"] = secureHash;
      vpcData["vpc_SecureHashType"] = this.vpcSecureAlgo;

      const response = await this.makeApiCall(vpcData);

      console.log("response \n", response);
      const processResponse = this.processQueryResponse(response)
      console.log("hello \n prcess response \n", processResponse);
      // Process successful refund
      if (response.vpc_TxnResponseCode === '0') {
        const newRefundedAmount = Number(paymentTransaction.refundedAmount) + refundData.amount;
        const newStatus = newRefundedAmount >= Number(paymentTransaction.amount)
          ? TransactionStatus.REFUNDED
          : TransactionStatus.PARTIALLY_REFUNDED;

        await paymentTransaction.update({
          refundedAmount: newRefundedAmount,
          status: newStatus,
        }, { transaction });

        this.logger.log('Refund processed successfully', {
          paymentId: refundData.paymentId,
          refundAmount: refundData.amount,
          newStatus,
        });
      }

      await transaction.commit();
      return paymentTransaction.reload();
    } catch (error) {
      await transaction.rollback();
      this.logger.error('Refund processing failed', {
        error: error.message,
        paymentId: refundData.paymentId
      });
      throw new BadRequestException('Refund processing failed');
    }
  }

  /**
   * Retrieves payment transaction status by ID
   * 
   * @param paymentId - Payment transaction ID
   * @returns Promise resolving to payment transaction data
   * @throws {NotFoundException} If payment is not found
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentTransaction> {
    const paymentTransaction = await this.paymentModel.findByPk(paymentId);

    if (!paymentTransaction) {
      throw new NotFoundException(`Payment not found: ${paymentId}`);
    }

    return paymentTransaction.dataValues;
  }

  /**
  * Queries payment status from MIGS gateway using merchant transaction reference
  * 
  * @param merchantTxnRef - Merchant transaction reference
  * @returns Promise resolving to gateway response
  * @throws {BadRequestException} When merchantTxnRef is invalid
  * @throws {NotFoundException} When transaction not found in database
  * @throws {ServiceUnavailableException} When gateway is unavailable
  */
  async queryPaymentByTxnRef(merchantTxnRef: string): Promise<any> {
    try {
      // Enhanced input validation
      if (!merchantTxnRef || typeof merchantTxnRef !== 'string') {
        throw new BadRequestException('Merchant Transaction Reference is required and must be a string');
      }

      const trimmedRef = merchantTxnRef.trim();
      if (trimmedRef.length === 0) {
        throw new BadRequestException('Merchant Transaction Reference cannot be empty');
      }

      // Optional: Add format validation
      if (trimmedRef.length < 5 || trimmedRef.length > 50) {
        throw new BadRequestException('Merchant Transaction Reference has invalid length');
      }

      // Check if transaction exists in database
      const transaction = await this.paymentModel.findOne({
        where: { merchantTxnRef: trimmedRef },
        attributes: ['id', 'merchantTxnRef', 'status', 'createdAt'] // Only fetch needed fields
      });

      if (!transaction) {
        throw new NotFoundException('Merchant Transaction Reference Id is Invalid');
      }

      const { dataValues } = transaction;
      // Log transaction found
      this.logger.log('Transaction found in database', {
        merchantTxnRef: trimmedRef,
        transactionId: dataValues.id,
        currentStatus: dataValues.status
      });

      // Prepare VPC data for MIGS query
      const vpcData = {
        vpc_Version: '1',
        vpc_Command: 'queryDR',
        vpc_AccessCode: this.config.accessCode,
        vpc_MerchTxnRef: trimmedRef,
        vpc_Merchant: this.config.merchantId,
        vpc_Locale: 'en',
        vpc_Gateway: 'ssl',
      };

      // Generate secure hash
      const secureHash = MigsHashUtil.generateSecureHash(
        vpcData,
        this.config.secureSecret,
        this.vpcSecureAlgo
      );

      vpcData["vpc_SecureHash"] = secureHash;
      vpcData["vpc_SecureHashType"] = this.vpcSecureAlgo;

      console.log("vpcData\n", vpcData);

      this.logger.log('Making payment query request', {
        merchantTxnRef: trimmedRef,
        gatewayUrl: this.config.gatewayQueryUrl,
        vpcVersion: vpcData.vpc_Version,
        command: vpcData.vpc_Command
      });

      const url = this.buildPaymentUrl(vpcData)
      console.log(`hii - ${url}`)
      // Make API call to MIGS gateway
      const response = await this.makeApiCall(vpcData);

      // Validate and process response
      const processedResponse = this.processQueryResponse(response, trimmedRef);

      this.logger.log('Payment query completed successfully', {
        merchantTxnRef: trimmedRef,
        responseReceived: !!response,
        responseCode: processedResponse?.vpc_TxnResponseCode || 'N/A',
        transactionNo: processedResponse?.vpc_TransactionNo || 'N/A'
      });

      return processedResponse;

    } catch (error) {
      this.logger.error('Payment query failed', {
        merchantTxnRef,
        error: error.message,
        errorType: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Processes and validates the query response from MIGS gateway
   * 
   * @private
   * @param response - Raw response from gateway
   * @param merchantTxnRef - Original merchant transaction reference
   * @returns Processed response object
   */
  private processQueryResponse(response: any, merchantTxnRef?: string): any {
    if (!response) {
      throw new ServiceUnavailableException('Empty response received from gateway');
    }

    // If response is a string and looks like an error, handle it
    if (typeof response === 'string' && !response.includes('vpc_')) {
      this.logger.warn('Unexpected string response from gateway', {
        merchantTxnRef,
        responseStart: response.substring(0, 100)
      });
      throw new ServiceUnavailableException('Invalid response format from gateway');
    }

    const { vpc_SecureHash, vpc_SecureHashType, ...dataForHash } = response;
    // Validate secure hash if present (recommended for security)
    if (response.vpc_SecureHash) {
      const isValidHash = MigsHashUtil.verifySecureHash(dataForHash, this.config.secureSecret, vpc_SecureHashType);
      if (!isValidHash) {
        this.logger.error('Invalid secure hash in response', { merchantTxnRef });
        throw new ServiceUnavailableException('Response validation failed');
      }
    }

    // Log important response details
    if (response.vpc_TxnResponseCode) {
      const responseCode = response.vpc_TxnResponseCode;
      const message = response.vpc_Message || 'No message';

      this.logger.log('Gateway response details', {
        merchantTxnRef,
        responseCode,
        message,
        transactionNo: response.vpc_TransactionNo
      });

      // You might want to handle specific response codes
      if (responseCode === '99') {
        this.logger.warn('Gateway returned unknown error', { merchantTxnRef, response });
      }
    }

    return response;
  }

  /**
   * Builds payment URL with encoded parameters
   * 
   * @private
   * @param params - URL parameters
   * @returns Formatted payment URL
   */
  private buildPaymentUrl(params: Record<string, string>): string {
    try {
      const query = Object.entries(params)
        .filter(([key, value]) => value != null) // Filter out null/undefined values
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      return `${this.config.gatewayUrl}?${query}`;
    } catch (error) {
      this.logger.error('Failed to build payment URL', { params, error: error.message });
      throw new Error('Failed to construct payment URL');
    }
  }



/**
 * Makes HTTP API call to MIGS gateway with enhanced error handling
 * 
 * @private
 * @param data - Request data
 * @returns Promise resolving to gateway response
 */
private async makeApiCall(data: Record<string, any>): Promise<any> {
  const formData = new URLSearchParams();

  // Build form data
  Object.entries(data).forEach(([key, value]) => {
    if (value != null && value !== '') { // Only append non-null, non-empty values
      formData.append(key, String(value));
    }
  });


  try {
    const response: AxiosResponse = await axios.post(
      this.config.gatewayQueryUrl,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MIGS-Client/1.0',
          'Accept': 'application/x-www-form-urlencoded, text/plain',
        },
        timeout: 30000, // 30 seconds timeout
        validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        maxRedirects: 0,
      }
    );

    // Handle different response status codes
    if (response.status >= 400) {
      this.logger.error('Gateway returned error status', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      throw new ServiceUnavailableException(`Gateway returned error status: ${response.status}`);
    }

    // Parse the response
    if (typeof response.data === 'string') {
      // Check if it's URL-encoded format
      if (response.data.includes('=') && (response.data.includes('&') || !response.data.includes(' '))) {
        return this.parseResponse(response.data);
      }
      // Handle plain text responses
      return { rawResponse: response.data };
    }

    // If it's already an object, return it
    return response.data;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      this.logger.error('Axios error in MIGS API call', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      
      if (error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException('Gateway request timed out');
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new ServiceUnavailableException('Gateway service is not reachable');
      }
      
      throw new ServiceUnavailableException(`Gateway communication failed: ${error.message}`);
    }
    
    this.logger.error('Unexpected error in MIGS API call', { 
      error: error.message,
      stack: error.stack 
    });
    throw new ServiceUnavailableException('Unexpected error during gateway communication');
  }
}

  /**
   * Parses URL-encoded response string into object
   * 
   * @private
   * @param responseString - URL-encoded response
   * @returns Parsed response object
   */
  private parseResponse(responseString: string): Record<string, any> {
    try {
      const params = new URLSearchParams(responseString);
      const result: Record<string, any> = {};

      for (const [key, value] of params.entries()) {
        // Try to parse numeric values
        if (/^\d+$/.test(value)) {
          result[key] = parseInt(value, 10);
        } else if (/^\d+\.\d+$/.test(value)) {
          result[key] = parseFloat(value);
        } else {
          result[key] = value;
        }
      }
      return result;

    } catch (error) {
      this.logger.error('Failed to parse response', {
        responseString: responseString.substring(0, 200),
        error: error.message
      });
      throw new Error('Failed to parse gateway response');
    }
  }

  /**
   * Generates unique merchant transaction reference
   * 
   * @private
   * @returns Unique transaction reference
   */
  private generateTxnRef(): string {
    return `MIGS_${Date.now()}_${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  /**
   * Generates unique refund transaction reference
   * 
   * @private
   * @returns Unique refund reference
   */
  private generateRefundTxnRef(): string {
    return `REF_${Date.now()}_${uuidv4().substring(0, 8).toUpperCase()}`;
  }
}

/* ========================================================================
 * SYSTEM REQUIREMENTS AND SPECIFICATIONS
 * ========================================================================
 * 
 * PROJECT: Payment Processing Service
 * VERSION: 1.0.0
 * LAST UPDATED: 2024
 * 
 * OVERVIEW:
 * This Payment Service provides comprehensive payment processing capabilities
 * using the MIGS (MasterCard Internet Gateway Service) payment gateway.
 * The service handles payment creation, processing, refunds, and status management
 * with full transaction lifecycle support.
 * 
 * ========================================================================
 * FUNCTIONAL REQUIREMENTS
 * ========================================================================
 * 
 * FR-001: Payment Creation
 * - System shall create payment transactions with unique merchant references
 * - System shall generate secure payment URLs for customer redirection
 * - System shall store transaction details in database with PENDING status
 * - System shall validate payment data before processing
 * - System shall generate secure hash for data integrity
 * 
 * FR-002: Payment Processing
 * - System shall process payment responses from MIGS gateway
 * - System shall verify secure hash of gateway responses
 * - System shall update transaction status based on gateway response
 * - System shall store complete gateway response for audit purposes
 * - System shall handle both successful and failed payment responses
 * 
 * FR-003: Payment Refunds
 * - System shall support both partial and full refunds
 * - System shall validate refund eligibility and available amounts
 * - System shall process refunds through MIGS gateway
 * - System shall update transaction status and refunded amounts
 * - System shall handle HTML responses from gateway for 3D Secure flows
 * 
 * FR-004: Payment Cancellation
 * - System shall allow cancellation of PENDING transactions only
 * - System shall update transaction status to CANCELLED
 * - System shall record cancellation timestamp
 * - System shall prevent cancellation of processed transactions
 * 
 * FR-005: Payment Status Management
 * - System shall provide payment status retrieval by ID
 * - System shall support gateway queries by merchant transaction reference
 * - System shall maintain complete transaction audit trail
 * - System shall track transaction lifecycle states
 * 
 * FR-006: Configuration Management
 * - System shall validate MIGS configuration on startup
 * - System shall support configurable gateway URLs and credentials
 * - System shall mask sensitive configuration in logs
 * - System shall fail fast if required configuration is missing
 * 
 * ========================================================================
 * NON-FUNCTIONAL REQUIREMENTS
 * ========================================================================
 * 
 * NFR-001: Security Requirements
 * - All payment data shall be transmitted using secure hash verification
 * - Sensitive configuration data shall be stored securely
 * - Database transactions shall use ACID properties
 * - Gateway communication shall use HTTPS only
 * - Secure secrets shall be in hexadecimal format
 * 
 * NFR-002: Performance Requirements
 * - Payment creation shall complete within 5 seconds
 * - Gateway API calls shall timeout after 30 seconds
 * - Database operations shall be transactional
 * - System shall handle concurrent payment requests
 * 
 * NFR-003: Reliability Requirements
 * - System shall use database transactions for data consistency
 * - Failed operations shall rollback database changes
 * - System shall log all operations for debugging
 * - System shall handle gateway timeouts gracefully
 * 
 * NFR-004: Scalability Requirements
 * - Service shall be stateless for horizontal scaling
 * - Database connections shall be pooled
 * - System shall handle high transaction volumes
 * - Configuration shall support multiple environments
 * 
 * NFR-005: Maintainability Requirements
 * - Code shall follow TypeScript best practices
 * - All methods shall have comprehensive documentation
 * - Error messages shall be descriptive and actionable
 * - Logging shall provide sufficient detail for debugging
 * 
 * NFR-006: Monitoring and Logging
 * - All operations shall be logged with appropriate levels
 * - Error conditions shall be logged with stack traces
 * - Performance metrics shall be trackable
 * - Audit trail shall be maintained for compliance
 * 
 * ========================================================================
 * TECHNICAL SPECIFICATIONS
 * ========================================================================
 * 
 * TS-001: Technology Stack
 * - Framework: NestJS with TypeScript
 * - Database: Sequelize ORM
 * - HTTP Client: Axios
 * - Logging: NestJS Logger
 * - Configuration: NestJS ConfigService
 * 
 * TS-002: Database Schema
 * - PaymentTransaction model with status tracking
 * - Support for refunded amounts and partial refunds
 * - Audit fields for created/updated timestamps
 * - Foreign key relationships for data integrity
 * 
 * TS-003: API Integration
 * - MIGS VPC (Virtual Payment Client) protocol
 * - SHA256 secure hash algorithm
 * - Form-encoded HTTP POST requests
 * - URL-encoded response parsing
 * 
 * TS-004: Error Handling
 * - Structured exception hierarchy
 * - Transactional rollback on failures
 * - Comprehensive error logging
 * - User-friendly error messages
 * 
 * TS-005: Data Transfer Objects
 * - CreatePaymentDto for payment creation
 * - RefundPaymentDto for refund requests
 * - PaymentResponseDto for gateway responses
 * - Validation decorators for input validation
 * 
 * ========================================================================
 * CONFIGURATION REQUIREMENTS
 * ========================================================================
 * 
 * ENV-001: Required Environment Variables
 * - MIGS_MERCHANT_ID: Merchant identifier from MIGS
 * - MIGS_ACCESS_CODE: Access code for merchant
 * - MIGS_SECURE_SECRET: Hexadecimal secure secret for hash generation
 * - MIGS_GATEWAY_URL: MIGS gateway endpoint URL
 * - MIGS_CURRENCY: Default currency code (e.g., AUD, USD)
 * - MIGS_RETURN_URL: Default return URL after payment
 * 
 * ENV-002: Optional Configuration
 * - Database connection settings
 * - Logging configuration
 * - Timeout settings
 * - Environment-specific overrides
 * 
 * ========================================================================
 * BUSINESS RULES
 * ========================================================================
 * 
 * BR-001: Transaction Status Flow
 * PENDING -> SUCCESS (payment successful)
 * PENDING -> FAILED (payment declined)
 * PENDING -> CANCELLED (user/system cancellation)
 * SUCCESS -> PARTIALLY_REFUNDED (partial refund)
 * SUCCESS -> REFUNDED (full refund)
 * PARTIALLY_REFUNDED -> REFUNDED (remaining amount refunded)
 * 
 * BR-002: Refund Rules
 * - Only SUCCESS transactions can be refunded
 * - Refund amount cannot exceed available amount
 * - Multiple partial refunds are supported
 * - Refund tracking is maintained for audit
 * 
 * BR-003: Amount Handling
 * - All amounts stored in base currency units (dollars/euros)
 * - Gateway amounts sent in minor units (cents)
 * - Refund calculations must account for previous refunds
 * - Amount validation prevents negative values
 * 
 * ========================================================================
 * INTEGRATION REQUIREMENTS
 * ========================================================================
 * 
 * INT-001: MIGS Gateway Integration
 * - VPC protocol implementation
 * - Secure hash generation and verification
 * - Support for pay, refund, and queryDR commands
 * - HTML response handling for 3D Secure
 * 
 * INT-002: Database Integration
 * - Sequelize ORM for database operations
 * - Transaction support for data consistency
 * - Model relationships and constraints
 * - Migration support for schema changes
 * 
 * INT-003: Logging Integration
 * - Structured logging with context
 * - Error tracking and monitoring
 * - Performance metrics collection
 * - Audit trail maintenance
 * 
 * ========================================================================
 * TESTING REQUIREMENTS
 * ========================================================================
 * 
 * TEST-001: Unit Testing
 * - All public methods shall have unit tests
 * - Mock external dependencies (database, gateway)
 * - Test error conditions and edge cases
 * - Validate business logic and calculations
 * 
 * TEST-002: Integration Testing
 * - Database integration tests
 * - Gateway integration tests (sandbox)
 * - End-to-end payment flow testing
 * - Configuration validation testing
 * 
 * TEST-003: Security Testing
 * - Secure hash validation testing
 * - Configuration security testing
 * - Input validation testing
 * - SQL injection prevention testing
 * 
 * ========================================================================
 * DEPLOYMENT REQUIREMENTS
 * ========================================================================
 * 
 * DEP-001: Environment Setup
 * - Staging and production environments
 * - Environment-specific configuration
 * - Database migration strategy
 * - Monitoring and alerting setup
 * 
 * DEP-002: Security Configuration
 * - Secure secret management
 * - HTTPS enforcement
 * - Database connection security
 * - Access control and authentication
 * 
 * DEP-003: Monitoring Setup
 * - Application performance monitoring
 * - Error tracking and alerting
 * - Business metrics collection
 * - Log aggregation and analysis
 * 
 * ========================================================================
 * MAINTENANCE REQUIREMENTS
 * ========================================================================
 * 
 * MAIN-001: Code Maintenance
 * - Regular dependency updates
 * - Security patch management
 * - Code quality monitoring
 * - Documentation updates
 * 
 * MAIN-002: Data Maintenance
 * - Database backup procedures
 * - Data retention policies
 * - Archive old transactions
 * - Performance optimization
 * 
 * MAIN-003: Operational Maintenance
 * - Log rotation and cleanup
 * - Monitoring alert management
 * - Performance tuning
 * - Capacity planning
 * 
 * ======================================================================== */