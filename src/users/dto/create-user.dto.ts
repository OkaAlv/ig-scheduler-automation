import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Format email tidak valid!' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password minimal harus 6 karakter!' })
  password: string;

  @IsEnum(Role, { message: 'Role harus berupa EDITOR, APPROVER, atau ADMIN' })
  role: Role;
}