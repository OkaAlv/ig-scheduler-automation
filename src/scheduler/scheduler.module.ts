import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '../prisma/prisma.module'; // Import Prisma

@Module({
  imports: [PrismaModule], // Tambahkan ini!
  providers: [SchedulerService],
})
export class SchedulerModule {}