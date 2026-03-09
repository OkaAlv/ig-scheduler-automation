import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔓 BUKA GEMBOK CORS DI SINI!
  // Ini mengizinkan Frontend (React/Vue/HTML) untuk menembak API Anda
  app.enableCors({
    origin: '*', // Untuk tahap development, kita izinkan dari mana saja
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
  console.log(`🚀 Aplikasi berjalan di: await app.getUrl()`);
}
bootstrap();