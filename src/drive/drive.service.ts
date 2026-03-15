import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service'; // Jembatan DB

@Injectable()
export class DriveService {
  private driveClient;

  // Inject PrismaService
  constructor(private readonly prisma: PrismaService) {
    try {
      // 🛡️ BACA DARI ENVIRONMENT VARIABLES (Aman untuk Render/Cloud)
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          // WAJIB pakai replace ini agar spasi/enter di kunci rahasia terbaca dengan benar oleh Render
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      
      this.driveClient = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API siap mengudara dari Cloud!');
    } catch (error) {
      console.error('❌ Gagal inisialisasi Drive:', error);
    }
  }

  async syncFolder(userId: string) { 
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      if (!folderId) throw new Error('Folder ID hilang di .env!');

      const response = await this.driveClient.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, webViewLink)',
      });

      const folders = response.data.files;
      let newSyncCount = 0;

      for (const folder of folders) {
        const existingPost = await this.prisma.post.findFirst({
          where: { drive_folder_id: folder.id },
        });

        if (!existingPost) {
          await this.prisma.post.create({
            data: {
              title: folder.name,
              drive_folder_id: folder.id,
              status: 'UNCONFIGURED',
              content_type: 'FEED',
              author_id: userId,
            },
          });
          newSyncCount++;
        }
      }

      return {
        message: `Sinkronisasi selesai! Menemukan ${folders.length} folder di Drive, dan menambahkan ${newSyncCount} draft baru ke Database.`,
        data: folders,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal Sinkronisasi: ' + error.message);
    }
  }

  // Fitur: Mengambil isi file (foto/video) di dalam sebuah folder
  async getFolderContents(folderId: string) {
    try {
      const response = await this.driveClient.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        // Kita minta link gambar (webContentLink/thumbnailLink) agar bisa ditampilkan di Frontend
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink)',
        orderBy: 'name', // SANGAT PENTING: Agar 1.jpg, 2.jpg urut sebagai slide Carousel IG!
      });

      const files = response.data.files;

      return {
        message: `Berhasil menemukan ${files.length} file media di dalam folder ini!`,
        data: files,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal membaca isi folder Drive: ' + error.message);
    }
  }
}