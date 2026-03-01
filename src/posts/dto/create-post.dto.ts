import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul postingan tidak boleh kosong!' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(2200, { message: 'Caption maksimal 2200 karakter (aturan IG)!' })
  caption?: string;

  @IsEnum(ContentType)
  @IsOptional()
  content_type?: ContentType;

  @IsUUID()
  @IsNotEmpty({ message: 'ID Author (Uploader) wajib diisi!' })
  author_id: string; 
}