import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Load your self-signed certificate and private key
  const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '..', 'cert', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '..', 'cert', 'cert.pem')),
  };

  const app = await NestFactory.create(AppModule, { httpsOptions });

  const paymentStatusQueue = app.get<Queue>('BullQueue_payment-status-sync');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(paymentStatusQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('MIGS Payment Gateway API')
    .setDescription('Payment gateway integration with MIGS')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on https://localhost:${port}`);
}
bootstrap();
