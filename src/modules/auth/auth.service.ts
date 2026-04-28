import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const hashedPwd = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPwd,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    await this.revokeAllRefreshTokens(user.id);
    await this.storeRefreshToken(user.id, refreshToken);

    res.cookie(
      'access_token',
      accessToken,
      this.getCookieOptions(15 * 60 * 1000),
    );

    res.cookie(
      'refresh_token',
      refreshToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  async logout(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const { matchedToken } = await this.findMatchingRefreshToken(refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: {
        revokedAt: new Date(),
      },
    });

    res.clearCookie('access_token', this.getCookieOptions(15 * 60 * 1000));
    res.clearCookie(
      'refresh_token',
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return { message: 'Logged out successfully' };
  }

  async refresh(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    const { payload, matchedToken } =
      await this.findMatchingRefreshToken(refreshToken);

    await this.prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: {
        revokedAt: new Date(),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newAccessToken = this.signAccessToken(user);
    const newRefreshToken = this.signRefreshToken(user);

    await this.storeRefreshToken(user.id, newRefreshToken);

    res.cookie(
      'access_token',
      newAccessToken,
      this.getCookieOptions(15 * 60 * 1000),
    );

    res.cookie(
      'refresh_token',
      newRefreshToken,
      this.getCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return { success: true };
  }

  private signAccessToken(user: { id: string; email: string }) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
      },
      {
        secret,
        expiresIn: '15m',
      },
    );
  }

  private signRefreshToken(user: { id: string; email: string }) {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    return this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      {
        secret,
        expiresIn: '7d',
        jwtid: randomUUID(),
      },
    );
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  private async findMatchingRefreshToken(refreshToken: string) {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET not configured');
    }

    const payload = this.jwtService.verify(refreshToken, { secret });

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        revokedAt: null,
      },
    });

    let matchedToken: RefreshToken | null = null;

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, storedToken.tokenHash);

      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Refresh token not recognized');
    }

    return { payload, matchedToken };
  }

  private async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private getCookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge,
    };
  }
}
