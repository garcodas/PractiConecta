import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
app.enableShutdownHooks();
const port = Number(process.env.PORT ?? 4000);
await app.listen(port);
new Logger('Bootstrap').log(`api-gateway escuchando en el puerto ${port}`);
