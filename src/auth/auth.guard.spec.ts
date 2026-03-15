import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  it('should be defined', () => {
    // Kita berikan "Alat Scanner Palsu" agar file test ini tidak error
    const mockJwtService = {} as JwtService;
    expect(new AuthGuard(mockJwtService)).toBeDefined();
  });
});