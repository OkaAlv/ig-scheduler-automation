import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatus } from '@prisma/client';

@Injectable()
export class PostsService {
  // Inject PrismaService ke dalam PostsService
  constructor(private readonly prisma: PrismaService) {}

  // Fitur 1: Membuat Draft Postingan Baru
  async create(createPostDto: CreatePostDto) {
    try {
      const newPost = await this.prisma.post.create({
        data: {
          title: createPostDto.title,
          caption: createPostDto.caption,
          content_type: createPostDto.content_type || 'FEED',
          author_id: createPostDto.author_id,
          status: 'DRAFT', // Otomatis masuk sebagai draft dulu
        },
      });
      return { message: 'Draft postingan berhasil dibuat!', data: newPost };
    } catch (error) {
      throw error;
    }
  }

  // Fitur: Editor mengirimkan Draft ke Approver
  async submit(id: string, userId: string) {
    // Pastikan user_id dikirim dari Postman
    if (!userId) {
      throw new BadRequestException('ID User (Editor) wajib dikirimkan!');
    }

    // 1. Cari postingannya dulu
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    // 2. Validasi status
    if (post.status !== 'DRAFT' && post.status !== 'UNCONFIGURED') {
      throw new BadRequestException(`Postingan tidak bisa disubmit karena statusnya saat ini: ${post.status}`);
    }

    // 3. Update status dan catat log
    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { status: 'SUBMITTED' },
      });

      await prisma.auditLog.create({
        data: {
          post_id: id,
          user_id: userId,
          action: 'SUBMIT',
          note: 'Editor mengirimkan draft untuk direview.',
        },
      });

      return updatedPost;
    });

    return { message: 'Draft berhasil dikirim ke Approver!', data: result };
  }

  // Fitur: Approver menyetujui draft postingan
  async approve(id: string, userId: string) {
    if (!userId) {
      throw new BadRequestException('ID User (Approver) wajib dikirimkan!');
    }

    // 1. Cari postingannya
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    // 2. Validasi: Hanya status SUBMITTED yang boleh di-approve
    if (post.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Gagal! Postingan saat ini berstatus ${post.status}. Hanya postingan SUBMITTED yang bisa disetujui.`
      );
    }

    // 3. Update status, isi approver_id, dan catat log
    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status: 'APPROVED',
          approver_id: userId, // Mencatat ID Fikri sebagai penyetuju
        },
      });

      await prisma.auditLog.create({
        data: {
          post_id: id,
          user_id: userId,
          action: 'APPROVE',
          note: 'Postingan telah di-review dan disetujui untuk tayang.',
        },
      });

      return updatedPost;
    });

    return { message: 'Mantap! Postingan berhasil disetujui.', data: result };
  }

  // Fitur: Approver menolak draft dan meminta revisi
  async reject(id: string, userId: string, reason: string) {
    if (!userId) {
      throw new BadRequestException('ID User (Approver) wajib dikirimkan!');
    }
    if (!reason) {
      throw new BadRequestException('Alasan penolakan (reason) wajib diisi agar Editor bisa merevisi!');
    }

    // 1. Cari postingannya
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    // 2. Validasi: Hanya status SUBMITTED yang boleh di-reject
    if (post.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Gagal! Postingan saat ini berstatus ${post.status}. Hanya postingan SUBMITTED yang bisa ditolak.`
      );
    }

    // 3. Kembalikan status ke DRAFT, dan catat alasannya di Audit Log
    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status: 'DRAFT', // Dikembalikan ke Draft agar Afifah bisa edit lagi
          approver_id: userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          post_id: id,
          user_id: userId,
          action: 'REJECT',
          note: `Ditolak dengan alasan: ${reason}`, // Alasan revisi dicatat di sini!
        },
      });

      return updatedPost;
    });

    return { message: 'Postingan dikembalikan ke Editor untuk direvisi.', data: result };
  }

  // Fitur 2: Mengambil Semua Data Postingan
  async findAll(page: number = 1, limit: number = 10, status?: PostStatus) {
    // 1. Hitung data mana yang harus dilewati (untuk halaman 2, 3, dst)
    const skip = (page - 1) * limit;
    
    // 2. Siapkan keranjang filter (kalau status kosong, tampilkan semua)
    const whereCondition = status ? { status } : {};

    // 3. Ambil data dan hitung total keseluruhan secara bersamaan
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        orderBy: { created_at: 'desc' }, // Urutkan dari yang paling baru
        include: {
          // AJAIB: Ubah UUID menjadi Nama Asli!
          author: { select: { name: true, role: true } },
          approver: { select: { name: true, role: true } },
        }
      }),
      this.prisma.post.count({ where: whereCondition })
    ]);

    // 4. Kembalikan data dengan format rapi untuk Frontend
    return {
      message: 'Berhasil mengambil data postingan',
      data: data,
      meta: {
        total_data: total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
        per_page: limit
      }
    };
  }
  

  findOne(id: string) {
    return `Ini aksi untuk mengambil postingan dengan ID #${id}`;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      // Pastikan NotFoundException sudah di-import di bagian atas file!
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    let newStatus = post.status;
    if (post.status === 'UNCONFIGURED') {
      newStatus = 'DRAFT';
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        caption: updatePostDto.caption,
        scheduled_time: updatePostDto.scheduled_time,
        status: newStatus, 
      },
    });

    return { 
      message: 'Postingan berhasil diperbarui dan siap di-submit!', 
      data: updatedPost 
    };
  }

  remove(id: string) {
    return `Ini aksi untuk menghapus postingan dengan ID #${id}`;
  }
}