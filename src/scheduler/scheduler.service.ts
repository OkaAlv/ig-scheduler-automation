import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndPublishPosts() {
    this.logger.log('🕵️‍♂️ Robot Scheduler sedang mengecek... (MODE BYPASS JADWAL AKTIF) 🚀');

    try {
      // MODE BRUTAL: Cari semua yang APPROVED, abaikan jadwal waktu!
      const postsToPublish = await this.prisma.post.findMany({
        where: {
          status: 'APPROVED',
        },
      });

      if (postsToPublish.length === 0) {
        this.logger.log('📭 Belum ada postingan status APPROVED.');
        return; 
      }

      this.logger.log(`🎯 Menemukan ${postsToPublish.length} postingan APPROVED! Memulai peluncuran ke Meta...`);

      for (const post of postsToPublish) {
        try {
          // Ambil Senjata dari .env
          const token = process.env.META_ACCESS_TOKEN;
          const igAccountId = process.env.IG_ACCOUNT_ID;

          // Gambar dummy untuk tes awal ke Meta
          const dummyImageUrl = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';

          // FASE 1: BIKIN WADAH
          this.logger.log(`📦 [Tahap 1] Mengirim gambar dan caption ke Meta...`);
          const containerResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${igAccountId}/media`,
            {
              image_url: dummyImageUrl,
              caption: post.caption,
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          const creationId = containerResponse.data.id;
          this.logger.log(`✅ [Tahap 1 SUKSES] Container ID: ${creationId}`);

          // FASE 2: PUBLISH KE FEED IG
          this.logger.log(`🔥 [Tahap 2] Menerbitkan ke Feed Instagram Anda...`);
          const publishResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
            {
              creation_id: creationId,
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          this.logger.log(`🎉 SUKSES BESAR! Postingan berhasil mendarat di Instagram! (ID: ${publishResponse.data.id})`);

          // Ubah status di database
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHED' },
          });

        } catch (metaError) {
          this.logger.error(`❌ GAGAL MENEMBAK META untuk Postingan ID: ${post.id}`);
          // Cetak kejujuran dari Meta agar kita tahu salahnya di mana
          this.logger.error(metaError.response?.data?.error?.message || metaError.message);
        }
      }
    } catch (error) {
      this.logger.error('❌ Terjadi kesalahan fatal di robot:', error);
    }
  }
}