import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Res,
  Req,
  Logger,
  ValidationPipe,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  GatewayTimeoutException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { 
  ApiTags
} from '@nestjs/swagger';

import { CreatePaymentDto, RefundPaymentDto, PaymentResponseDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';
import { HealthCheckResponse, PaymentApiResponse, PaymentCancellationData, PaymentCreationData, PaymentStatusData, RefundResponseData } from './interfaces/payment.interface';
import { ApiServiceHealthCheck, CancelPaymentSwaggerDocs, CreatePaymentSwaggerDocs, GetPaymentStatusSwaggerDocs, PaymentCallbackSwaggerDocs, QueryPaymentDocs, RefundPaymentSwaggerDocs } from './decorators/payment.decorator';
import { ManualPaymentSyncDocs, PaymentSyncQueueStatusDocs } from './decorators/queue.decorator';
import { UpdateQueueService } from './updateStatusQueue';

/**
 * PaymentController
 * 
 * RESTful API controller that handles all payment-related HTTP requests.
 * Provides endpoints for payment creation, processing, refunds, cancellations,
 * status inquiries, health monitoring, and automated payment status synchronization.
 * 
 * Features automated background job processing using Bull Queue to periodically
 * check pending transactions and synchronize their status with the MIGS gateway.
 * 
 * @class PaymentController
 * @version 1.0.0
 * @author Payment Team
 * @since 2024
 */
@ApiTags('Payment Gateway API')
@Controller('api/payments')
@UseInterceptors(ClassSerializerInterceptor)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  /**
   * PaymentController Constructor
   * 
   * @param paymentService - Injected payment service for business logic
   */
  constructor(
    private readonly paymentService: PaymentService,
    private readonly updateQueueService: UpdateQueueService
  ) {}

  /**
   * Manual trigger for payment status synchronization
   * Allows administrators to manually trigger payment status sync
   * 
   * @returns Promise resolving to job creation confirmation
   */
  @Post('admin/sync-status')
  @ManualPaymentSyncDocs()
  async triggerStatusSync(): Promise<PaymentApiResponse<any>> {
    return await this.updateQueueService.triggerStatusSync();
  }


  /**
   * Get payment synchronization queue status
   * Provides information about the current state of the payment sync queue
   * 
   * @returns Promise resolving to queue status information
   */
  @Get('admin/sync-status')
  @PaymentSyncQueueStatusDocs()
  async getQueueStatus(): Promise<PaymentApiResponse<any>> {
    return await this.updateQueueService.getQueueStatus();
  }

  /**
   * Creates a new payment transaction
   * 
   * Initiates a payment process by creating a transaction record and generating
   * a secure payment URL for customer redirection to the payment gateway.
   * 
   * @param createPaymentDto - Payment creation request data
   * @param req - Express request object for client IP extraction
   * @returns Promise resolving to payment creation response
   */
  @Post('create')
  @CreatePaymentSwaggerDocs()
  async createPayment(
    @Body(ValidationPipe) createPaymentDto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentApiResponse<PaymentCreationData>> {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

      const result = await this.paymentService.createPayment(createPaymentDto, clientIp);
      const { dataValues } = result.transaction;

      const responseData: PaymentCreationData = {
        paymentId: dataValues.id,
        merchantTxnRef: dataValues.merchantTxnRef,
        paymentUrl: result.paymentUrl,
        amount: dataValues.amount,
        currency: dataValues.currency,
        status: dataValues.status,
      };

      this.logger.log('Payment created via API', {
        paymentId: dataValues.id,
        merchantTxnRef: dataValues.merchantTxnRef,
        amount: dataValues.amount,
        clientIp,
      });

      return {
        success: true,
        data: responseData,
        message: 'Payment created successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Payment creation failed via API', {
        error: error.message,
        stack: error.stack,
        requestData: createPaymentDto,
      });
      throw error;
    }
  }

  /**
   * Handles payment callback from MIGS gateway
   * 
   * Processes the payment response from the MIGS gateway, validates the response,
   * updates the transaction status, and redirects the customer to the appropriate
   * frontend page based on the payment result.
   * 
   * @param responseData - Payment response data from MIGS gateway
   * @param res - Express response object for redirection
   * @returns Promise resolving to redirect response
   */
  @Get('callback')
  @PaymentCallbackSwaggerDocs()
  async handleCallback(
    @Query() responseData: PaymentResponseDto, 
    @Res() res: Response
  ): Promise<void> {
    try {

      const transaction = await this.paymentService.processPaymentResponse(responseData);
      const { dataValues } = transaction;

      this.logger.log('Payment callback processed successfully', {
        merchantTxnRef: dataValues.merchantTxnRef,
        status: dataValues.status,
        paymentId: dataValues.id,
      });

      // Redirect to frontend with payment result
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectUrl = dataValues.status === 'success'
        ? `${frontendUrl}/payment/success?ref=${dataValues.merchantTxnRef}&id=${dataValues.id}`
        : `${frontendUrl}/payment/failure?ref=${dataValues.merchantTxnRef}&id=${dataValues.id}`;

      return res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.logger.error('Payment callback processing failed', {
        error: error.message,
        stack: error.stack,
        responseData: JSON.stringify(responseData),
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(HttpStatus.FOUND, `${frontendUrl}/payment/error`);
    }
  }

  /**
   * Cancels a pending payment transaction
   * 
   * Cancels a payment transaction that is in PENDING status. Only pending
   * transactions can be cancelled. Processed transactions cannot be cancelled.
   * 
   * @param paymentId - ID of the payment to cancel
   * @returns Promise resolving to cancellation confirmation
   */
  @Post('cancel/:paymentId')
  @CancelPaymentSwaggerDocs()
  async cancelPayment(
    @Param('paymentId') paymentId: string
  ): Promise<PaymentApiResponse<PaymentCancellationData>> {
    try {
      const transaction = await this.paymentService.cancelPayment(paymentId);
      const { dataValues } = transaction;

      const responseData: PaymentCancellationData = {
        paymentId: dataValues.id,
        merchantTxnRef: dataValues.merchantTxnRef,
        status: dataValues.status,
      };

      this.logger.log('Payment cancelled via API', {
        paymentId: dataValues.id,
        merchantTxnRef: dataValues.merchantTxnRef,
      });

      return {
        success: true,
        data: responseData,
        message: 'Payment cancelled successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Payment cancellation failed via API', {
        error: error.message,
        paymentId,
      });
      throw error;
    }
  }

  /**
   * Processes a payment refund
   * 
   * Initiates a refund process through the MIGS gateway. Supports both partial
   * and full refunds. May return HTML content for 3D Secure authentication flows.
   * 
   * @param refundData - Refund request data
   * @param res - Express response object for potential HTML responses
   * @returns Promise resolving to refund confirmation or HTML response
   */
  @Post('refund')
  @RefundPaymentSwaggerDocs()
  async refundPayment(
    @Body(ValidationPipe) refundData: RefundPaymentDto
  ): Promise<PaymentApiResponse<RefundResponseData> | void> {
    try {
      const transaction = await this.paymentService.refundPayment(refundData);
      const { dataValues } = transaction;

      const responseData: RefundResponseData = {
        paymentId: dataValues.id,
        refundedAmount: dataValues.refundedAmount,
        status: dataValues.status,
        totalAmount: dataValues.amount,
      };

      this.logger.log('Refund processed via API', {
        paymentId: dataValues.id,
        refundAmount: refundData.amount,
        newStatus: dataValues.status,
      });

      return {
        success: true,
        data: responseData,
        message: 'Refund processed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Refund processing failed via API', {
        error: error.message,
        paymentId: refundData.paymentId,
        refundAmount: refundData.amount,
      });
      throw error;
    }
  }

  /**
   * Retrieves payment transaction status
   * 
   * Fetches comprehensive payment transaction information including current status,
   * gateway response details, and transaction history.
   * 
   * @param paymentId - ID of the payment to query
   * @returns Promise resolving to payment status information
   */
  @Get('status/:paymentId')
  @GetPaymentStatusSwaggerDocs()
  async getPaymentStatus(
    @Param('paymentId') paymentId: string
  ): Promise<PaymentApiResponse<PaymentStatusData>> {
    try {
      const transaction = await this.paymentService.getPaymentStatus(paymentId);

      const responseData: PaymentStatusData = {
        paymentId: transaction.id,
        merchantTxnRef: transaction.merchantTxnRef,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        responseCode: transaction.responseCode,
        responseMessage: transaction.responseMessage,
        authCode: transaction.authCode,
        receiptNo: transaction.receiptNo,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt,
      };

      this.logger.log('Payment status retrieved via API', {
        paymentId: transaction.id,
        merchantTxnRef: transaction.merchantTxnRef,
        status: transaction.status,
      });

      return {
        success: true,
        data: responseData,
        message: 'Payment status retrieved successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Payment status retrieval failed via API', {
        error: error.message,
        paymentId,
      });

      throw error;
    }
  }

  /**
 * Queries payment by merchant transaction reference
 * 
 * Queries payment information directly from the MIGS gateway using the
 * merchant transaction reference. Useful for reconciliation and status verification.
 * 
 * @param merchantTxnRef - Merchant transaction reference
 * @returns Promise resolving to gateway query response
 */
@Get('query/:merchantTxnRef')
@QueryPaymentDocs()
async queryPayment(
  @Param('merchantTxnRef') merchantTxnRef: string,
): Promise<PaymentApiResponse<any>> {
  try {
    // Validate parameter format (basic validation)
    if (!merchantTxnRef || merchantTxnRef.trim().length === 0) {
      throw new BadRequestException('Merchant transaction reference cannot be empty');
    }

    const result = await this.paymentService.queryPaymentByTxnRef(merchantTxnRef.trim());

    this.logger.log('Payment queried via API', {
      merchantTxnRef,
      hasResult: !!result,
      responseCode: result?.vpc_TxnResponseCode || 'N/A'
    });

    return {
      success: true,
      data: result,
      message: 'Payment queried successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error('Payment query failed via API', {
      error: error.message,
      merchantTxnRef,
      errorType: error.constructor.name
    });

    // Re-throw known exceptions, wrap unknown ones
    if (error instanceof BadRequestException || 
        error instanceof NotFoundException || 
        error instanceof ServiceUnavailableException) {
      throw error;
    }

    // Handle gateway-specific errors
    if (error.message?.includes('timeout')) {
      throw new GatewayTimeoutException('Gateway request timed out');
    }
    
    if (error.message?.includes('Gateway')) {
      throw new ServiceUnavailableException('Gateway service temporarily unavailable');
    }

    // Generic error handling
    throw new InternalServerErrorException('Payment query failed due to internal error');
  }
}

  /**
   * Health check endpoint
   * 
   * Provides service health status and basic system information.
   * Used for monitoring, load balancing, and system health verification.
   * 
   * @returns Health check response with service status
   */
  @Get('health')
  @ApiServiceHealthCheck()
  healthCheck(): HealthCheckResponse {
    this.logger.debug('Health check requested');

    return {
      status: 'healthy',
      service: 'MIGS Payment Gateway',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

/* ========================================================================
 * API REQUIREMENTS AND SPECIFICATIONS
 * ========================================================================
 * 
 * PROJECT: Payment Gateway REST API
 * VERSION: 1.0.0
 * LAST UPDATED: 2024
 * 
 * OVERVIEW:
 * This API provides comprehensive payment processing capabilities through
 * RESTful endpoints. The API integrates with MIGS (MasterCard Internet Gateway
 * Service) to handle payment transactions, refunds, cancellations, and status
 * inquiries with full audit trail and security compliance.
 * 
 * ========================================================================
 * API ENDPOINT SPECIFICATIONS
 * ========================================================================
 * 
 * API-001: Payment Creation Endpoint
 * POST /api/payments/create
 * 
 * PURPOSE: Creates a new payment transaction and returns payment URL
 * AUTHENTICATION: Required (based on business requirements)
 * RATE LIMITING: 100 requests per minute per client IP
 * 
 * REQUEST:
 * - Content-Type: application/json
 * - Body: CreatePaymentDto (validated)
 * - Headers: Authorization (if authentication required)
 * 
 * RESPONSE:
 * - Status: 201 Created (success)
 * - Content-Type: application/json
 * - Body: PaymentCreationResponse
 * 
 * ERROR RESPONSES:
 * - 400 Bad Request: Invalid request data
 * - 401 Unauthorized: Authentication required
 * - 429 Too Many Requests: Rate limit exceeded
 * - 500 Internal Server Error: System error
 * 
 * BUSINESS RULES:
 * - Payment amount must be greater than 0
 * - Currency must be supported by gateway
 * - Customer email format must be valid
 * - Order information is required
 * 
 * ========================================================================
 * 
 * API-002: Payment Callback Endpoint
 * GET /api/payments/callback
 * 
 * PURPOSE: Handles payment responses from MIGS gateway
 * AUTHENTICATION: Not required (gateway callback)
 * SECURITY: Secure hash verification for data integrity
 * 
 * REQUEST:
 * - Method: GET
 * - Query Parameters: PaymentResponseDto
 * - Source: MIGS Gateway only
 * 
 * RESPONSE:
 * - Status: 302 Found (redirect)
 * - Location: Frontend URL with payment result
 * - Content-Type: text/html
 * 
 * ERROR RESPONSES:
 * - 400 Bad Request: Invalid hash or missing parameters
 * - 302 Found: Redirect to error page on processing failure
 * 
 * SECURITY REQUIREMENTS:
 * - Must verify secure hash from gateway
 * - Log all callback attempts for audit
 * - Handle replay attack prevention
 * 
 * ========================================================================
 * 
 * API-003: Payment Cancellation Endpoint
 * POST /api/payments/cancel/:paymentId
 * 
 * PURPOSE: Cancels a pending payment transaction
 * AUTHENTICATION: Required (based on business requirements)
 * AUTHORIZATION: User must own the payment or have admin rights
 * 
 * REQUEST:
 * - Method: POST
 * - Path Parameter: paymentId (string)
 * - Headers: Authorization
 * 
 * RESPONSE:
 * - Status: 200 OK (success)
 * - Content-Type: application/json
 * - Body: PaymentCancellationResponse
 * 
 * ERROR RESPONSES:
 * - 400 Bad Request: Payment cannot be cancelled
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Insufficient permissions
 * - 404 Not Found: Payment not found
 * 
 * BUSINESS RULES:
 * - Only PENDING payments can be cancelled
 * - Processed payments cannot be cancelled
 * - Audit trail must be maintained
 * 
 * ========================================================================
 * 
 * API-004: Payment Refund Endpoint
 * POST /api/payments/refund
 * 
 * PURPOSE: Processes payment refunds through gateway
 * AUTHENTICATION: Required (admin/merchant level)
 * SPECIAL HANDLING: May return HTML for 3D Secure flows
 * 
 * REQUEST:
 * - Content-Type: application/json
 * - Body: RefundPaymentDto (validated)
 * - Headers: Authorization
 * 
 * RESPONSE:
 * - Status: 200 OK (success)
 * - Content-Type: application/json OR text/html
 * - Body: RefundResponse OR HTML content
 * 
 * ERROR RESPONSES:
 * - 400 Bad Request: Invalid refund request
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Insufficient permissions
 * - 404 Not Found: Payment not found
 * 
 * BUSINESS RULES:
 * - Only SUCCESS payments can be refunded
 * - Refund amount cannot exceed available balance
 * - Multiple partial refunds are supported
 * - Full audit trail required
 * 
 * ========================================================================
 * 
 * API-005: Payment Status Endpoint
 * GET /api/payments/status/:paymentId
 * 
 * PURPOSE: Retrieves comprehensive payment status information
 * AUTHENTICATION: Required (based on business requirements)
 * AUTHORIZATION: User must own payment or have read access
 * 
 * REQUEST:
 * - Method: GET
 * - Path Parameter: paymentId (string)
 * - Headers: Authorization
 * 
 * RESPONSE:
 * - Status: 200 OK (success)
 * - Content-Type: application/json
 * - Body: PaymentStatusResponse
 * 
 * ERROR RESPONSES:
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Insufficient permissions
 * - 404 Not Found: Payment not found
 * 
 * DATA INCLUDED:
 * - Payment basic information
 * - Current status and timestamps
 * - Gateway response details
 * - Authorization and receipt information
 * 
 * ========================================================================
 * 
 * API-006: Payment Query Endpoint
 * GET /api/payments/query/:merchantTxnRef
 * 
 * PURPOSE: Queries payment directly from gateway
 * AUTHENTICATION: Required (merchant/admin level)
 * USAGE: Reconciliation and status verification
 * 
 * REQUEST:
 * - Method: GET
 * - Path Parameter: merchantTxnRef (string)
 * - Headers: Authorization
 * 
 * RESPONSE:
 * - Status: 200 OK (success)
 * - Content-Type: application/json
 * - Body: Gateway response data
 * 
 * ERROR RESPONSES:
 * - 400 Bad Request: Invalid transaction reference
 * - 401 Unauthorized: Authentication required
 * - 503 Service Unavailable: Gateway unavailable
 * 
 * USE CASES:
 * - Payment reconciliation
 * - Status verification
 * - Dispute resolution
 * - Audit trail completion
 * 
 * ========================================================================
 * 
 * API-007: Health Check Endpoint
 * GET /api/payments/health
 * 
 * PURPOSE: Service health monitoring and status verification
 * AUTHENTICATION: Not required
 * USAGE: Load balancer health checks, monitoring systems
 * 
 * REQUEST:
 * - Method: GET
 * - No parameters required
 * 
 * RESPONSE:
 * - Status: 200 OK (healthy)
 * - Content-Type: application/json
 * - Body: HealthCheckResponse
 * 
 * HEALTH INDICATORS:
 * - Service availability
 * - System timestamp
 * - Version information
 * - Environment details
 * 
 * ========================================================================
 * AUTHENTICATION & AUTHORIZATION REQUIREMENTS
 * ========================================================================
 * 
 * AUTH-001: Authentication Strategy
 * - JWT Bearer tokens for API authentication
 * - API key authentication for server-to-server calls
 * - Session-based authentication for web applications
 * - OAuth 2.0 support for third-party integrations
 * 
 * AUTH-002: Authorization Levels
 * - GUEST: Health check only
 * - CUSTOMER: Create payments, view own payment status
 * - MERCHANT: All customer permissions + refunds, cancellations
 * - ADMIN: Full access to all operations and data
 * 
 * AUTH-003: Security Headers
 * - Authorization: Bearer <token> OR API-Key <key>
 * - X-Request-ID: Unique request identifier
 * - X-Client-IP: Client IP for audit logging
 * - X-User-Agent: Client identification
 * 
 * ========================================================================
 * DATA VALIDATION REQUIREMENTS
 * ========================================================================
 * 
 * VAL-001: Input Validation
 * - All request bodies validated using class-validator
 * - Path parameters validated for format and existence
 * - Query parameters sanitized and validated
 * - File uploads (
 */