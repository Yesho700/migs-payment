import { InjectQueue } from "@nestjs/bull";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bull";
import { PaymentApiResponse } from "./interfaces/payment.interface";


@Injectable()
export class UpdateQueueService implements OnModuleInit{
    private readonly logger = new Logger(UpdateQueueService.name);

    constructor(
        @InjectQueue('payment-status-sync')
        private readonly paymentStatusQueue: Queue
    ){}

      /**
       * Module initialization hook
       * Sets up recurring jobs for payment status synchronization
       */
      async onModuleInit(): Promise<void> {
        try {
            this.paymentStatusQueue.on('error', (error) => {
            this.logger.error(`❌ Queue error: ${error.message}`, error.stack);
          });
    
          this.paymentStatusQueue.on('waiting', (jobId) => {
            this.logger.log(`📋 Job ${jobId} is waiting`);
          });
    
          this.paymentStatusQueue.on('active', (job) => {
            this.logger.log(`🔄 Job ${job.id} started`);
          });
    
          this.paymentStatusQueue.on('completed', (job) => {
            this.logger.log(`✅ Job ${job.id} completed`);
          });
    
          this.paymentStatusQueue.on('failed', (job, err) => {
            this.logger.error(`❌ Job ${job.id} failed: ${err.message}`);
          });
          // Remove all waiting jobs
          const waitingJobs = await this.paymentStatusQueue.getWaiting();
          await Promise.all(waitingJobs.map(job => job.remove()));
    
          // Remove all completed jobs
          const completedJobs = await this.paymentStatusQueue.getCompleted();
          await Promise.all(completedJobs.map(job => job.remove()));
    
          // Remove all failed jobs
          const failedJobs = await this.paymentStatusQueue.getFailed();
          await Promise.all(failedJobs.map(job => job.remove()));
    
          // Add recurring job for payment status synchronization
          await this.paymentStatusQueue.add(
            'sync-pending-payments',
            {},
            {
              repeat: { cron: '*/5 * * * *' }, // Every 5 minutes
              removeOnComplete: 10, // Keep last 10 completed jobs
              removeOnFail: 5, // Keep last 5 failed jobs
              jobId: 'sync-pending-payments-recurring',
            }
          );
    
          this.logger.log('Payment status synchronization job scheduled successfully');
        } catch (error) {
          this.logger.error('Failed to initialize payment status sync jobs', {
            error: error.message,
            stack: error.stack,
          });
        }
      }


      async triggerStatusSync(): Promise<PaymentApiResponse<any>> {
          try {
            const job = await this.paymentStatusQueue.add(
              'sync-pending-payments',
              { 
                triggeredBy: 'manual',
                timestamp: new Date().toISOString(),
              },
              {
                priority: 1, // High priority for manual triggers
                removeOnComplete: 5,
                removeOnFail: 3,
              }
            );
      
            this.logger.log('Manual payment status sync triggered', {
              jobId: job.id,
              triggeredAt: new Date().toISOString(),
            });
      
            return {
              success: true,
              data: {
                jobId: job.id,
                status: 'queued',
                scheduledAt: new Date().toISOString(),
              },
              message: 'Payment status synchronization job queued successfully',
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            this.logger.error('Failed to queue manual status sync', {
              error: error.message,
              stack: error.stack,
            });
            throw error;
          }
        }
      
        /**
         * Cron job for payment status synchronization
         * Fallback cron job that runs every 10 minutes as a safety net
         * in case the Bull Queue recurring job fails
         */
        @Cron('*/10 * * * *', {
          name: 'fallback-payment-status-sync',
          timeZone: 'UTC',
        })
        async handlePaymentStatusSyncCron(): Promise<void> {
          try {
            // Check if there are any active sync jobs in the queue
            const waiting = await this.paymentStatusQueue.getWaiting();
            const active = await this.paymentStatusQueue.getActive();
      
            // Only trigger fallback if no sync jobs are queued or active
            if (waiting.length === 0 && active.length === 0) {
              await this.paymentStatusQueue.add(
                'sync-pending-payments',
                {
                  triggeredBy: 'fallback-cron',
                  timestamp: new Date().toISOString(),
                },
                {
                  removeOnComplete: 3,
                  removeOnFail: 2,
                }
              );
      
              this.logger.log('Fallback payment status sync triggered via cron');
            } else {
              this.logger.debug('Skipping fallback sync - existing jobs in queue', {
                waiting: waiting.length,
                active: active.length,
              });
            }
          } catch (error) {
            this.logger.error('Fallback payment status sync cron failed', {
              error: error.message,
              stack: error.stack,
            });
          }
        }

        async getQueueStatus(): Promise<PaymentApiResponse<any>> {
        try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.paymentStatusQueue.getWaiting(),
            this.paymentStatusQueue.getActive(),
            this.paymentStatusQueue.getCompleted(),
            this.paymentStatusQueue.getFailed(),
            this.paymentStatusQueue.getDelayed(),
        ]);

        const queueStatus = {
            queueName: 'payment-status-sync',
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            paused: await this.paymentStatusQueue.isPaused(),
            lastJobTimestamp: active.length > 0 ? active[0].timestamp : null,
        };

        return {
            success: true,
            data: queueStatus,
            message: 'Queue status retrieved successfully',
            timestamp: new Date().toISOString(),
        };
        } catch (error) {
        this.logger.error('Failed to retrieve queue status', {
            error: error.message,
            stack: error.stack,
        });
        throw error;
        }
    }

}