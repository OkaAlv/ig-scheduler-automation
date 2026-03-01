import { PrismaClient, Role } from '@prisma/client';
// Karena kita pakai adapter pg di v7
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import 'dotenv/config';

// Inisialisasi koneksi persis seperti di service kita
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Memulai proses seeding data...');

  // 1. Bersihkan data lama (opsional, agar tidak duplikat jika di-run ulang)
  await prisma.user.deleteMany();
  console.log('🧹 Data users lama dibersihkan.');

  // Acak password default "rahasia123" untuk semua akun tim inti
  const defaultPassword = await bcrypt.hash('rahasia123', 10);
  console.log('🔐 Mengacak password default...');

  // 2. Insert Data Tim Inti
  const oka = await prisma.user.create({
    data: {
      email: 'oka@diskominfo.medan.go.id',
      name: 'Oka Alvansyah',
      role: Role.ADMIN,
      is_active: true,
      password: defaultPassword, // <--- Sudah ditambahkan
    },
  });

  const afifah = await prisma.user.create({
    data: {
      email: 'afifah@diskominfo.medan.go.id',
      name: 'Afifah Naila Nasution',
      role: Role.EDITOR,
      is_active: true,
      password: defaultPassword, // <--- Sudah ditambahkan
    },
  });

  const fikri = await prisma.user.create({
    data: {
      email: 'fikri@diskominfo.medan.go.id',
      name: 'M. Fikri Zulfi',
      role: Role.APPROVER,
      is_active: true,
      password: defaultPassword, // <--- Sudah ditambahkan
    },
  });

  console.log('✅ Seeding berhasil! Data user:');
  console.log({ 
    Admin: oka.name, 
    Editor: afifah.name, 
    Approver: fikri.name 
  });
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Tutup pool koneksi pg
  });