import { Controller, Post, Get, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '../auth/auth.guard'; // Sesuaikan path jika berbeda
import { RolesGuard } from '../auth/guards/roles.guard'; // Sesuaikan path jika berbeda
import { Roles } from '../auth/decorators/roles.decorator';; // Sesuaikan path jika berbeda

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN') 
  async create(@Body() createUserDto: CreateUserDto) {
    console.log('Admin sedang mendaftarkan user baru...');
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN') // Hanya Admin yang boleh lihat daftar tim
  async findAll() {
    return this.usersService.findAll();
  }

  @Delete(':id') // Menangkap ID dari URL (contoh: /users/4dbda2...)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN') // Hanya Admin yang boleh memecat/menghapus staf
  async remove(@Param('id') id: string) {
    console.log(`Admin sedang menghapus user ID: ${id}`);
    return this.usersService.remove(id);
  }

}