import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostStatus } from '@prisma/client';

@Injectable()
export class PostsService {
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
          status: 'DRAFT', 
        },
      });
      return { message: 'Draft postingan berhasil dibuat!', data: newPost };
    } catch (error) {
      throw error;
    }
  }

  // Fitur: Editor mengirimkan Draft (atau Revisi) ke Approver
  async submit(id: string, userId: string) {
    if (!userId) {
      throw new BadRequestException('ID User (Editor) wajib dikirimkan!');
    }

    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    // 💡 PERBAIKAN: Izinkan status REJECTED untuk dikirim ulang setelah direvisi!
    if (post.status !== 'DRAFT' && post.status !== 'UNCONFIGURED' && post.status !== 'REJECTED') {
      throw new BadRequestException(`Postingan tidak bisa disubmit karena statusnya saat ini: ${post.status}`);
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status: 'SUBMITTED',
          reject_reason: null, // 🧹 Hapus alasan penolakan lama karena sudah direvisi
        },
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

    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    if (post.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Gagal! Postingan saat ini berstatus ${post.status}. Hanya postingan SUBMITTED yang bisa disetujui.`
      );
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status: 'APPROVED',
          approver_id: userId, 
          reject_reason: null, // 🧹 Pastikan bersih dari sisa alasan reject
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

    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    if (post.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Gagal! Postingan saat ini berstatus ${post.status}. Hanya postingan SUBMITTED yang bisa ditolak.`
      );
    }

    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status: 'REJECTED', // 🚨 UBAH JADI REJECTED!
          approver_id: userId,
          reject_reason: reason, // 📝 Simpan pesan revisi ke database!
        },
      });

      await prisma.auditLog.create({
        data: {
          post_id: id,
          user_id: userId,
          action: 'REJECT',
          note: `Ditolak dengan alasan: ${reason}`, 
        },
      });

      return updatedPost;
    });

    return { message: 'Postingan dikembalikan ke Editor untuk direvisi.', data: result };
  }

  // Fitur 2: Mengambil Semua Data Postingan
  async findAll(page: number = 1, limit: number = 10, status?: PostStatus) {
    const skip = (page - 1) * limit;
    const whereCondition = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        orderBy: { created_at: 'desc' }, 
        include: {
          author: { select: { name: true, role: true } },
          approver: { select: { name: true, role: true } },
        }
      }),
      this.prisma.post.count({ where: whereCondition })
    ]);

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
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    const payload = updatePostDto || {};

    let newStatus = post.status;
    if (post.status === 'UNCONFIGURED') {
      newStatus = 'DRAFT';
    }

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        caption: payload.caption,
        content_type: payload.content_type, // 💡 Pastikan format konten (REELS/CAROUSEL) ikut tersimpan
        scheduled_time: payload.scheduled_time,
        status: newStatus, 
      },
    });

    return { 
      message: 'Postingan berhasil diperbarui!', 
      data: updatedPost 
    };
  }

  async deletePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('Postingan tidak ditemukan di database!');
    }

    const deletedPost = await this.prisma.post.update({
      where: { id },
      data: { status: 'DELETED' },
    });

    return { 
      message: 'Postingan berhasil dibatalkan dan dihapus dari antrean.', 
      data: deletedPost 
    };
  }

  // Fitur Baru: Mengambil Statistik Dashboard
  async getDashboardStats() {
    // Kita suruh Prisma menghitung semuanya secara paralel (bersamaan) agar super cepat!
    const [total, submitted, approved, published, rejected] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.post.count({ where: { status: 'APPROVED' } }),
      this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.post.count({ where: { status: 'REJECTED' } }),
    ]);

    return {
      total,
      submitted,
      approved,
      published,
      rejected
    };
  }

  async remove(id: string) {
    // 1. Pastikan post-nya ada terlebih dahulu
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new Error('Data tidak ditemukan!');

    // 2. Ubah statusnya menjadi 'DELETED' (bukan dihapus fisik)
    return this.prisma.post.update({
      where: { id },
      data: { status: 'DELETED' }, 
    });
  }

  async restorePost(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    
    if (!post) throw new Error('Data tidak ditemukan!');
    if (post.status !== 'DELETED') throw new Error('Hanya data terhapus yang bisa dipulihkan!');

    return this.prisma.post.update({
      where: { id },
      data: { status: 'UNCONFIGURED' }, // Balikkan ke status awal agar bisa di-set ulang
    });
  }

  async hardDeletePost(id: string) {
    // 1. Cek dulu apakah datanya ada
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new Error('Data tidak ditemukan atau sudah dihapus!');
    }

    // 2. Eksekusi hapus fisik dari tabel
    return await this.prisma.post.delete({
      where: { id },
    });
  }
}