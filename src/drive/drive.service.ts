import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service'; // Jembatan DB

@Injectable()
export class DriveService {
  private driveClient;

  // Inject PrismaService ke sini
  constructor(private readonly prisma: PrismaService) {
    try {
      const keyFilePath = path.join(process.cwd(), 'credentials', 'google-drive.json');
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      this.driveClient = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API siap!');
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
              author_id: userId, // 2. Masukkan userId ke kolom author_id!
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
      // Kita suruh Google mencari file yang "orang tuanya" adalah folderId ini
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