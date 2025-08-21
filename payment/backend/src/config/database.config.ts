import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): SequelizeModuleOptions => ({
  dialect: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.name'),
  models: [__dirname + '/../**/*.model{.ts,.js}'],
  autoLoadModels: true,
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('DB_LOGGING') === 'true' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
