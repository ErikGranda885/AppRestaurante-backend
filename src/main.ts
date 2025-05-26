import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser'; // ✅ Importa cookie-parser

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Habilita lectura de cookies (necesario para JWT en cookies)
  app.use(cookieParser());

  // Pipes globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Serializador global
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // ✅ Habilita CORS con envío de cookies
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true, // 👈 importante para permitir cookies cross-origin
  });

  await app.listen(5000);
}
bootstrap();
