import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config'; // Memastikan variabel DATABASE_URL terbaca

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // 1. Buat koneksi pool native ke PostgreSQL menggunakan pg
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // 2. Bungkus koneksi tersebut dengan Prisma Adapter
    const adapter = new PrismaPg(pool);
    
    // 3. Masukkan adapter ke dalam pengaturan PrismaClient (aturan baru v7)
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database terhubung dengan sukses via Prisma Adapter!');
  }
}