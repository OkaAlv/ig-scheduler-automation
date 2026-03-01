import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Satpam meminta tiket dari saku pengunjung (Header Authorization)
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('BERHENTI! Anda belum login (Tiket tidak ditemukan).');
    }
    
    try {
      // 2. Satpam mengecek keaslian tiket menggunakan stempel rahasia
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'RAHASIA_NEGARA_MEDAN_123', 
      });
      
      // 3. Jika asli, Satpam menempelkan ID Card pengunjung ke bajunya (request.user)
      // agar nanti Controller kita tahu siapa yang sedang berkunjung.
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('BERHENTI! Tiket Anda palsu atau sudah kadaluarsa!');
    }
    
    // 4. Silakan masuk!
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}