import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SequelizeModule } from '@nestjs/sequelize';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';

import { Transaction } from '../database/models/transaction.model';
import { WebhookLog } from 'src/database/models/webhook-logs.model';
import { MashreqService } from './services/meshreq.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    SequelizeModule.forFeature([Transaction, WebhookLog]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, MashreqService],
  exports: [PaymentService, MashreqService],
})
export class PaymentModule {}