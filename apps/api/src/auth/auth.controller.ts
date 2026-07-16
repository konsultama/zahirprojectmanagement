import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail({}, { message: 'Email tidak valid.' }) email!: string;
  @IsString() @MinLength(1, { message: 'Kata sandi wajib diisi.' }) password!: string;
}

function bearer(header?: string): string {
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Token tidak ada.');
  return header.slice(7);
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.auth.me(bearer(authorization));
  }
}
