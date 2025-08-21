
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ThrottlerModule } from '@nestjs/throttler';

import { PaymentModule } from './payment/payment.module';
import { getDatabaseConfig } from './config/database.config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration]
    }),
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    ThrottlerModule.forRoot(),

    PaymentModule
  ],
})
export class AppModule {}
