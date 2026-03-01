import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string) {
    // 1. Cari apakah emailnya ada di database
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Gagal! Email atau password salah.');
    }

    // 2. Cocokkan password yang diketik dengan password acak di database
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Gagal! Email atau password salah.');
    }

    // 3. Jika cocok, cetak "Tiket Emas" (Token JWT)
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      message: 'Login Berhasil!',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      }
    };
  }
}