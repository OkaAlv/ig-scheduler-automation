import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService {
  // Logger ini untuk memunculkan pesan warna-warni di Terminal VS Code
  private readonly logger = new Logger(SchedulerService.name);

  // Jangan lupa sambungkan Prisma agar robot bisa mengecek database
  constructor(private readonly prisma: PrismaService) {}

  // Robot ini akan bangun dan mengeksekusi fungsi ini setiap 1 menit!
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndPublishPosts() {
    this.logger.debug('🤖 Robot Cron sedang mengecek jadwal postingan...');

    const waktuSekarang = new Date();

    try {
      // 1. Cari postingan yang statusnya APPROVED, dan jam tayangnya <= Waktu Sekarang
      const postsToPublish = await this.prisma.post.findMany({
        where: {
          status: 'APPROVED',
          scheduled_time: {
            lte: waktuSekarang, // lte = less than or equal (sudah lewat / waktunya pas)
          },
        },
      });

      // Jika tidak ada, biarkan robotnya tidur lagi
      if (postsToPublish.length === 0) {
        return; 
      }

      this.logger.log(`🚀 Menemukan ${postsToPublish.length} postingan yang siap tayang!`);

      // 2. Eksekusi postingannya satu per satu
      for (const post of postsToPublish) {
        
        // --- DI SINI NANTI KITA AKAN MENEMBAK API INSTAGRAM ASLI ---
        // (Untuk sekarang, kita simulasikan saja kalau sudah sukses terkirim ke IG)

        // 3. Ubah statusnya di database menjadi PUBLISHED
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHED' },
        });

        this.logger.log(`✅ [BERHASIL] Postingan "${post.title}" telah dipublish ke Instagram!`);
      }
    } catch (error) {
      this.logger.error('❌ Terjadi kesalahan saat robot mengecek jadwal:', error);
    }
  }
} 