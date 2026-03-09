import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DriveService } from '../drive/drive.service';
import axios from 'axios';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driveService: DriveService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkAndPublishPosts() {
    this.logger.log('🕵️‍♂️ Robot Scheduler sedang mengecek jadwal... (MODE DISIPLIN) ⏳');

    const now = new Date();

    try {
      const postsToPublish = await this.prisma.post.findMany({
        where: {
          status: 'APPROVED',
          scheduled_time: { lte: now },
        },
      });

      if (postsToPublish.length === 0) {
        this.logger.log('📭 Belum ada postingan yang jadwalnya tiba.');
        return; 
      }

      this.logger.log(`🎯 Menemukan ${postsToPublish.length} postingan siap tayang!`);

      for (const post of postsToPublish) {
        try {
          const token = process.env.META_ACCESS_TOKEN;
          const igAccountId = process.env.IG_ACCOUNT_ID;

          if (!post.drive_folder_id) {
            this.logger.warn(`⚠️ Postingan ${post.id} tidak memiliki Folder Drive. Dilewati.`);
            continue; 
          }

          this.logger.log(`📂 Memindai Folder Drive: ${post.drive_folder_id}...`);
          const driveFiles = await this.driveService.getFolderContents(post.drive_folder_id);

          // Pisahkan file berdasarkan jenisnya
          const videoFiles = driveFiles.data.filter(file => file.mimeType.includes('video/'));
          const imageFiles = driveFiles.data.filter(file => file.mimeType.includes('image/')).slice(0, 10);

          let creationId = '';

          // ==========================================
          // FASE 1: LOGIKA PEMILIHAN FORMAT KONTEN
          // ==========================================
          if (videoFiles.length > 0) {
            // --------------------------------------------------
            // JALUR 1: MODE REELS (VIDEO)
            // --------------------------------------------------
            this.logger.log(`🎬 Mode REELS aktif untuk video: ${videoFiles[0].name}...`);
            
            // JURUS BYPASS: Paksa Google Drive untuk langsung memberikan file MP4 (Hindari webContentLink)
            const videoUrl = `https://drive.google.com/uc?export=download&id=${videoFiles[0].id}`;

            this.logger.log(`📦 [Tahap 1] Mengirim Video ke Meta...`);
            const containerRes = await axios.post(
              `https://graph.facebook.com/v19.0/${igAccountId}/media`,
              {
                media_type: 'REELS',
                video_url: videoUrl,
                caption: post.caption,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            creationId = (containerRes.data as any).id;
            this.logger.log(`✅ [Tahap 1 SUKSES] Container Reels ID: ${creationId}`);

            // 🛑 SISTEM RADAR: Polling Status Video
            let videoStatus = 'IN_PROGRESS';
            let attempts = 0;
            this.logger.log(`📡 Menyalakan radar... Menunggu Meta selesai memproses video...`);
            
            while (videoStatus !== 'FINISHED' && attempts < 20) {
              await new Promise(resolve => setTimeout(resolve, 10000)); // Tunggu 10 detik
              attempts++;
              
              // KITA TAMBAHKAN 'status' AGAR META MEMBERI TAHU ALASAN ERROR-NYA
              const statusRes = await axios.get(
                `https://graph.facebook.com/v19.0/${creationId}?fields=status_code,status`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              
              videoStatus = (statusRes.data as any).status_code;
              const detailedStatus = (statusRes.data as any).status; // Intip alasan aslinya

              this.logger.log(`   -> Status Pengecekan ke-${attempts}: ${videoStatus}`);
              
              if (videoStatus === 'ERROR') {
                this.logger.error(`❌ Detail Error dari Meta:`, detailedStatus);
                throw new Error(`Meta menolak video. Alasan: ${detailedStatus?.error_message || 'Format tidak didukung / Diblokir Google'}`);
              }
            }

          } else if (imageFiles.length === 1) {
            // --------------------------------------------------
            // JALUR 2: MODE SINGLE POST (1 GAMBAR)
            // --------------------------------------------------
            this.logger.log(`🖼️ Mode SINGLE POST aktif...`);
            const imageUrl = imageFiles[0].thumbnailLink.replace(/=s\d+/, '=s1080');
            
            const containerRes = await axios.post(
              `https://graph.facebook.com/v19.0/${igAccountId}/media`,
              { image_url: imageUrl, caption: post.caption },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            creationId = (containerRes.data as any).id;
            
            this.logger.log(`⏳ Menunggu 10 detik agar Meta merakit gambar...`);
            await new Promise(r => setTimeout(r, 10000));

          } else if (imageFiles.length > 1) {
            // --------------------------------------------------
            // JALUR 3: MODE CAROUSEL (BANYAK GAMBAR)
            // --------------------------------------------------
            this.logger.log(`🎠 Mode CAROUSEL aktif untuk ${imageFiles.length} gambar...`);
            const childrenIds: string[] = [];

            for (let i = 0; i < imageFiles.length; i++) {
              this.logger.log(`   -> Upload item ${i + 1}/${imageFiles.length}...`);
              const imageUrl = imageFiles[i].thumbnailLink.replace(/=s\d+/, '=s1080');
              
              const itemRes = await axios.post(
                `https://graph.facebook.com/v19.0/${igAccountId}/media`,
                { image_url: imageUrl, is_carousel_item: true },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              childrenIds.push((itemRes.data as any).id);
              await new Promise(r => setTimeout(r, 3000)); 
            }

            this.logger.log(`📦 Menggabungkan menjadi Album...`);
            const parentRes = await axios.post(
              `https://graph.facebook.com/v19.0/${igAccountId}/media`,
              { media_type: 'CAROUSEL', children: childrenIds.join(','), caption: post.caption },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            creationId = (parentRes.data as any).id;
            
            this.logger.log(`⏳ Menunggu 20 detik agar Meta merakit Album...`);
            await new Promise(r => setTimeout(r, 20000));

          } else {
            throw new Error(`Folder tidak berisi Media (Foto/Video) yang valid!`);
          }

          // ==========================================
          // FASE 2: PUBLISH KE FEED INSTAGRAM (BERLAKU UNTUK SEMUA)
          // ==========================================
          this.logger.log(`🔥 [Tahap 2] Menerbitkan ke Feed Instagram...`);
          const publishResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
            { creation_id: creationId },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          this.logger.log(`🎉 SUKSES BESAR! Konten mendarat di Instagram! (ID: ${(publishResponse.data as any).id})`);

          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'PUBLISHED' },
          });

        } catch (error) {
          this.logger.error(`❌ GAGAL MEMPOSTING ID: ${post.id}`);
          this.logger.error(error.response?.data?.error?.message || error.message);
        }
      }
    } catch (error) {
      this.logger.error('❌ Terjadi kesalahan fatal di robot utama:', error);
    }
  }
}