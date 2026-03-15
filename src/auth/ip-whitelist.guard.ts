import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const allowedIpsString = process.env.ALLOWED_IPS;

    // 1. CEK SAKLAR: Jika di .env kosong, biarkan semua orang masuk (Bypass)
    if (!allowedIpsString || allowedIpsString.trim() === '') {
      return true; 
    }

    // 2. AMBIL IP PENGUNJUNG (Mendukung server cloud/Render/Railway)
    let clientIp = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    
    // Jika formatnya 'ip1, ip2', ambil yang pertama
    if (typeof clientIp === 'string' && clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    // 3. COCOKKAN IP
    const ipList = allowedIpsString.split(',').map(ip => ip.trim());
    const isAllowed = ipList.some(ip => clientIp.includes(ip));

    if (!isAllowed) {
      this.logger.warn(`🚨 BLOKIR: Upaya akses dari IP asing ditolak -> ${clientIp}`);
      throw new ForbiddenException('Akses Ditolak: Anda tidak berada di jaringan resmi kantor Diskominfo.');
    }

    return true; // Jika IP cocok, silakan lewat!
  }
}