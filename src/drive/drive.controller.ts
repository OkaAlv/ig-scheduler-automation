import { Controller, Post, Body, BadRequestException, Get, Param } from '@nestjs/common';
import { DriveService } from './drive.service';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  // Endpoint: POST /drive/sync
  @Post('sync')
  async syncDrive(@Body('user_id') userId: string) {
    if (!userId) {
      throw new BadRequestException('ID User wajib dikirimkan untuk menjadi Author dari draft ini!');
    }
    
    // Kirim userId ke dalam service
    return this.driveService.syncFolder(userId);
  }

  // JALUR BARU: GET /drive/folder/:folderId
  @Get('folder/:folderId')
  async getFolderContents(@Param('folderId') folderId: string) {
    return this.driveService.getFolderContents(folderId);
  }
}

