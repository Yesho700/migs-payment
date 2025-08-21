import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';

export function ManualPaymentSyncDocs() {
  return applyDecorators(
    HttpCode(HttpStatus.ACCEPTED),
    ApiOperation({
      summary: 'Manually trigger payment status synchronization',
      description:
        'Triggers immediate synchronization of pending payment statuses with MIGS gateway.',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: HttpStatus.ACCEPTED,
      description: 'Synchronization job queued successfully',
      schema: {
        example: {
          success: true,
          data: {
            jobId: 'sync-12345',
            status: 'queued',
            scheduledAt: '2024-01-15T11:00:00.000Z',
          },
          message:
            'Payment status synchronization job queued successfully',
          timestamp: '2024-01-15T11:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Admin authentication required',
    }),
  );
}


export function PaymentSyncQueueStatusDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get payment synchronization queue status',
      description:
        'Returns current status of the payment synchronization queue including job counts and recent activity.',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Queue status retrieved successfully',
      schema: {
        example: {
          success: true,
          data: {
            queueName: 'payment-status-sync',
            waiting: 2,
            active: 1,
            completed: 45,
            failed: 3,
            delayed: 0,
            paused: false,
          },
          message: 'Queue status retrieved successfully',
          timestamp: '2024-01-15T11:05:00.000Z',
        },
      },
    }),
  );
}

