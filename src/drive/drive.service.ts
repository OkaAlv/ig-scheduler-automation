import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service'; // Jembatan DB

@Injectable()
export class DriveService {
  private driveClient;

  // Inject PrismaService
  constructor(private readonly prisma: PrismaService) {
    try {
      // 🛡️ BACA DARI ENVIRONMENT VARIABLES
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
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
      let updatedCount = 0;

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
        } else {
          if (existingPost.title !== folder.name) {
            await this.prisma.post.update({
              where: { id: existingPost.id },
              data: { title: folder.name },
            });
            updatedCount++;
          }
        }
      }

      return {
        message: `Sinkronisasi selesai! Menemukan ${folders.length} folder di Drive. Berhasil menambah ${newSyncCount} draft baru dan memperbarui judul pada ${updatedCount} draft lama.`,
        data: folders,
      };
    } catch (error) {
      throw new InternalServerErrorException('Gagal Sinkronisasi: ' + error.message);
    }
  }

  // 👇 INI FUNGSI YANG HILANG TADI, SAYA MASUKKAN LAGI 👇
  async getFolderContents(folderId: string) {
    try {
      const response = await this.driveClient.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink)',
        orderBy: 'name', 
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