import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DriveModule } from '../drive/drive.module'; // <-- IMPORT INI

@Module({
  imports: [PrismaModule, DriveModule], // <-- TAMBAHKAN DI SINI
  providers: [SchedulerService],
})
export class SchedulerModule {}