import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IpWhitelistGuard } from './auth/ip-whitelist.guard'; // 👈 1. Import satpamnya

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ 2. Aktifkan fitur "Trust Proxy" (Sangat PENTING saat di-deploy ke internet agar bisa membaca IP asli)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().set('trust proxy', 1);

  // 🛡️ 3. Taruh satpam di pintu depan (Menjaga semua jalur)
  app.useGlobalGuards(new IpWhitelistGuard());

  app.enableCors(); // Izinkan akses dari Frontend React

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Server Backend menyala di port ${port}`);
}
bootstrap();