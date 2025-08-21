import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Transaction } from './models/transaction.model';
import { WebhookLog } from './models/webhook-logs.model';


@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        models: [Transaction, WebhookLog],
        autoLoadModels: true,
        synchronize: false, // Use migrations in production
        logging: configService.get('NODE_ENV') === 'development',
        pool: {
          max: 20,
          min: 5,
          acquire: 60000,
          idle: 10000,
        },
        dialectOptions: {
          ssl: configService.get('NODE_ENV') === 'production' ? {
            require: true,
            rejectUnauthorized: false,
          } : false,
        },
      }),
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([Transaction, WebhookLog]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}