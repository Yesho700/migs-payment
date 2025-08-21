// payment-swagger.decorator.ts
import { applyDecorators, Header, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiConsumes, ApiProduces, ApiBody, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreatePaymentDto, RefundPaymentDto } from '../dto/payment.dto';


export function CreatePaymentSwaggerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new payment transaction',
      description: 'Creates a payment transaction and returns a secure payment URL for customer redirection to the MIGS gateway.',
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiBody({
      type: CreatePaymentDto,
      description: 'Payment creation request payload',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Payment created successfully',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: "12345",
            merchantTxnRef: "MIGS_1640995200000_A1B2C3D4",
            paymentUrl: "https://migs.gateway.com/pay?vpc_AccessCode=...",
            amount: 99.99,
            currency: "AUD",
            status: "pending"
          },
          message: "Payment created successfully",
          timestamp: "2024-01-15T10:30:00.000Z"
        }
      }
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid payment data provided',
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: 'Internal server error occurred',
    }),
  );
}

export function PaymentCallbackSwaggerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Handle payment callback from MIGS gateway',
      description: 'Processes payment responses from MIGS gateway and redirects customers to appropriate frontend pages.',
    }),
    ApiProduces('text/html'),
    ApiQuery({
      name: 'vpc_MerchTxnRef',
      description: 'Merchant transaction reference',
      required: true,
      type: String,
    }),
    ApiQuery({
      name: 'vpc_TxnResponseCode',
      description: 'Transaction response code from gateway',
      required: true,
      type: String,
    }),
    ApiResponse({
      status: HttpStatus.FOUND,
      description: 'Redirect to frontend application with payment result',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid callback data or hash verification failed',
    }),
  );
}


export function CancelPaymentSwaggerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cancel a pending payment transaction',
      description: 'Cancels a payment transaction that is currently in PENDING status.',
    }),
    ApiProduces('application/json'),
    ApiParam({
      name: 'paymentId',
      description: 'Unique identifier of the payment to cancel',
      type: String,
      example: '12345',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Payment cancelled successfully',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: "12345",
            merchantTxnRef: "MIGS_1640995200000_A1B2C3D4",
            status: "cancelled"
          },
          message: "Payment cancelled successfully",
          timestamp: "2024-01-15T10:35:00.000Z"
        }
      }
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Payment not found',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Payment cannot be cancelled (not in pending status)',
    }),
  );
}


export function RefundPaymentSwaggerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Process a payment refund',
      description: 'Initiates a refund process through MIGS gateway. Supports partial and full refunds.',
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiBody({
      type: RefundPaymentDto,
      description: 'Refund request payload',
    }),
    Header('Content-Type', 'application/json'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Refund processed successfully',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: "12345",
            refundedAmount: 50.00,
            status: "partially_refunded",
            totalAmount: 99.99
          },
          message: "Refund processed successfully",
          timestamp: "2024-01-15T10:40:00.000Z"
        }
      }
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Payment not found',
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Payment not eligible for refund or invalid refund amount',
    }),
  );
}


export function GetPaymentStatusSwaggerDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get payment transaction status',
      description: 'Retrieves comprehensive payment transaction information including status, gateway responses, and timestamps.',
    }),
    ApiProduces('application/json'),
    ApiParam({
      name: 'paymentId',
      description: 'Unique identifier of the payment transaction',
      type: String,
      example: '12345',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Payment status retrieved successfully',
      schema: {
        example: {
          success: true,
          data: {
            paymentId: "12345",
            merchantTxnRef: "MIGS_1640995200000_A1B2C3D4",
            transactionId: "TXN123456789",
            amount: 99.99,
            currency: "AUD",
            status: "success",
            responseCode: "0",
            responseMessage: "Approved",
            authCode: "AUTH123",
            receiptNo: "RCP456789",
            createdAt: "2024-01-15T10:00:00.000Z",
            processedAt: "2024-01-15T10:05:00.000Z"
          },
          message: "Payment status retrieved successfully",
          timestamp: "2024-01-15T10:45:00.000Z"
        }
      }
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Payment not found',
    }),
  );
}


export function QueryPaymentDocs() {
  return applyDecorators(
    ApiOperation({ 
      summary: 'Query payment by merchant transaction reference',
      description: 'Queries payment information directly from MIGS gateway using merchant transaction reference for reconciliation and status verification.'
    }),
    ApiProduces('application/json'),
    ApiParam({
      name: 'merchantTxnRef',
      description: 'Merchant transaction reference to query',
      type: String,
      example: 'MIGS_1754975490850_3E5E5FB0',
      required: true
    }),
    ApiResponse({ 
      status: HttpStatus.OK, 
      description: 'Payment queried successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              vpc_MerchTxnRef: { type: 'string', example: 'MIGS_1640995200000_A1B2C3D4' },
              vpc_TransactionNo: { type: 'string', example: 'TXN123456789' },
              vpc_TxnResponseCode: { type: 'string', example: '0', description: '0 = Success' },
              vpc_Message: { type: 'string', example: 'Approved' },
              vpc_Amount: { type: 'number', example: 10000, description: 'Amount in cents' },
              vpc_OrderInfo: { type: 'string', example: 'Order #12345' },
              vpc_BatchNo: { type: 'string', example: '20240115' },
              vpc_Card: { type: 'string', example: 'VC' },
              vpc_SecureHash: { type: 'string', example: 'ABC123...' }
            }
          },
          message: { type: 'string', example: 'Payment queried successfully' },
          timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:50:00.000Z' }
        }
      }
    }),
    ApiResponse({ 
      status: HttpStatus.BAD_REQUEST, 
      description: 'Invalid merchant transaction reference',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Merchant Transaction Reference is required and must be a string' },
          error: { type: 'string', example: 'Bad Request' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ 
      status: HttpStatus.NOT_FOUND, 
      description: 'Transaction not found in database',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Merchant Transaction Reference Id is Invalid' },
          error: { type: 'string', example: 'Not Found' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ 
      status: HttpStatus.SERVICE_UNAVAILABLE, 
      description: 'Gateway service unavailable',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Gateway service temporarily unavailable' },
          error: { type: 'string', example: 'Service Unavailable' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    }),
    ApiResponse({ 
      status: HttpStatus.GATEWAY_TIMEOUT, 
      description: 'Gateway request timeout'
    }),
  );
}


export function ApiServiceHealthCheck() {
  return applyDecorators(
    ApiOperation({
      summary: 'Service health check',
      description: 'Returns service health status and basic system information for monitoring purposes.',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Service is healthy',
      schema: {
        example: {
          status: "healthy",
          service: "MIGS Payment Gateway",
          timestamp: "2024-01-15T10:55:00.000Z",
          version: "1.0.0",
          environment: "production"
        }
      }
    })
  );
}
