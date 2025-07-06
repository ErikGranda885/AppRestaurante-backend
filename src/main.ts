import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

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

  // ✅ Habilita CORS con envío de cookies solo para producción
  const allowedOrigin = process.env.FRONTEND_URL_PROD;

  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
  });

  console.log('✅ CORS Origin habilitado:', allowedOrigin);

  await app.listen(parseInt(process.env.PORT || '8080', 10), '0.0.0.0');
}
bootstrap();
