import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Satpam meminta tiket dari saku pengunjung
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('BERHENTI! Anda belum login (Tiket tidak ditemukan).');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        // 🛡️ KUNCI RAHASIA SUDAH DISAMAKAN DENGAN MESIN TIKET
        secret: process.env.JWT_SECRET as string, 
      });
      
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('BERHENTI! Tiket Anda palsu atau sudah kadaluarsa!');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}