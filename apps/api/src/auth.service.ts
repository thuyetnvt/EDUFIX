import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private publicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private accessToken(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    return this.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      { expiresIn: "15m" },
    );
  }

  private async createSession(userId: string) {
    const refreshToken = randomBytes(48).toString("base64url");
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return refreshToken;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    )
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng");
    const refreshToken = await this.createSession(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      accessToken: this.accessToken(user),
      refreshToken,
      expiresIn: 900,
      user: this.publicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.tokenHash(refreshToken) },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      throw new UnauthorizedException(
        "Refresh token không hợp lệ hoặc đã hết hạn",
      );
    const nextToken = randomBytes(48).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: {
          userId: session.userId,
          tokenHash: this.tokenHash(nextToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);
    return {
      accessToken: this.accessToken(session.user),
      refreshToken: nextToken,
      expiresIn: 900,
      user: this.publicUser(session.user),
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.tokenHash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
