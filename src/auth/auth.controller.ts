import { Controller, Post, Body, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard'; // Pastikan path AuthGuard ini benar sesuai project Anda

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Endpoint: POST /auth/login
  @Post('login')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.login(signInDto.email, signInDto.password);
  }

  // Endpoint Baru: PATCH /auth/change-password
  @UseGuards(AuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req, @Body('newPassword') newPassword: string) {
    // req.user.sub ini otomatis didapat dari token JWT orang yang sedang login!
    const userId = req.user.sub; 
    
    // Kita lempar tugas beratnya (hashing & simpan ke database) ke AuthService
    return this.authService.changePassword(userId, newPassword);
  }
}