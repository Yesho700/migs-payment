import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WebhookController } from './webhook.controller';
import { WebhookLog } from 'src/database/models/webhook-logs.model';
import { PaymentModule } from 'src/payment/payment.module';


@Module({
  imports: [
    SequelizeModule.forFeature([WebhookLog]),
    PaymentModule,
  ],
  controllers: [WebhookController],
})
export class WebhookModule {}