import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format waktu harus standar ISO-8601 (Contoh: 2026-03-01T10:00:00Z)' })
  scheduled_time?: string;
}