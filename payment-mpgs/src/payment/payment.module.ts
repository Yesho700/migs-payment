import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './payment.entity';
import { PaymentService } from './payment.service';
import { MpgsService } from './mpgs.service';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([Payment]),
  ],
  providers: [PaymentService, MpgsService],
  controllers: [PaymentController],
  exports: [PaymentService, MpgsService],
})
export class PaymentModule {}