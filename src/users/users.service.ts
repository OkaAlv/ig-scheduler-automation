import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. FUNGSI PENDAFTARAN (Hanya oleh Admin)
  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Gagal! Email ini sudah terdaftar di sistem.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
      },
    });

    // Menghilangkan password dari response agar aman
    const { password, ...result } = newUser;
    
    return {
      message: 'Akun berhasil didaftarkan!',
      data: result,
    };
  }

  // 2. FUNGSI PENTING: Cari User Berdasarkan Email (Dipakai saat Login)
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // 3. LIHAT SEMUA TIM (Bermanfaat untuk Dashboard Admin)
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  // 4. CARI USER BERDASARKAN ID
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User tidak ditemukan!');
    const { password, ...result } = user;
    return result;
  }

  // 5. HAPUS USER (Jika ada staf yang resign/pindah divisi)
  async remove(id: string) {
    // 1. Cek dulu usernya ada atau tidak
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Gagal! User tidak ditemukan di database.');
    }

    // 2. Eksekusi hapus beneran
    await this.prisma.user.delete({
      where: { id },
    });

    return { 
      message: `Sukses! Akun ${user.email} telah dihapus dari sistem.` 
    };
  }

  async updatePassword(id: string, hashedPassword: string) {
  return this.prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

}