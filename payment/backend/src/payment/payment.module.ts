import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import PaymentTransaction from './models/payment-transaction.model';
import { UpdateQueueService } from './updateStatusQueue';


@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([PaymentTransaction]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          redis: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 60 * 1000
            },
            removeOnComplete: 10,
            removeOnFail: 5,
          }
        }
      }
    }),
    BullModule.registerQueueAsync({
      name: 'payment-status-sync',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60 * 1000,
          },
          removeOnComplete: 10,
          removeOnFail: 5,
        }
      })
    })
  ],
  controllers: [PaymentController],
  providers: [PaymentService, UpdateQueueService],
  exports: [PaymentService, UpdateQueueService],
})
export class PaymentModule { }
