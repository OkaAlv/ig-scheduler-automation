import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // Untuk mengecek data user
import { PrismaModule } from '../prisma/prisma.module'; // Untuk akses database

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    // Konfigurasi Mesin Pembuat Tiket (JWT)
    JwtModule.register({
      global: true,
      secret: 'RAHASIA_NEGARA_MEDAN_123', // Kunci rahasia untuk menyegel tiket (nanti bisa dipindah ke .env)
      signOptions: { expiresIn: '1d' }, // Tiket otomatis hangus/expired dalam 1 hari
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}