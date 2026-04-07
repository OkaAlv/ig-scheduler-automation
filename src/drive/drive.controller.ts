import { Controller, Post, Body, BadRequestException, Get, Param } from '@nestjs/common';
import { DriveService } from './drive.service';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Post('sync')
  async syncDrive(@Body('user_id') userId: string) {
    if (!userId) {
      throw new BadRequestException('ID User wajib dikirimkan!');
    }
    return this.driveService.syncFolder(userId);
  }

  @Get('folder/:folderId')
  async getFolderContents(@Param('folderId') folderId: string) {
    // Jika masih merah di sini, ikuti Langkah 3 di bawah!
    return this.driveService.getFolderContents(folderId);
  }
}