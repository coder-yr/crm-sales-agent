import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Your account is ${user.status.toLowerCase()}. Please contact support.`);
    }

    if (user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async activateAccount(token: string, pass: string) {
    const invite = await this.usersService.getInviteByToken(token);
    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.usersService.activateUser(token, passwordHash);

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, await bcrypt.hash(tokens.refreshToken, 10));

    const { passwordHash: _, refreshToken: __, ...userResult } = user;
    return {
      user: userResult,
      ...tokens,
    };
  }

  async login(email: string, pass: string) {
    const user = await this.validateUser(email, pass);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, await bcrypt.hash(tokens.refreshToken, 10));

    return {
      user,
      ...tokens,
    };
  }

  async register(data: { email: string; password: string }) {
    if (!data.email || !data.password) {
      throw new BadRequestException('Email and password are required');
    }

    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const baseSlug = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const tenantSlug = `${baseSlug}-${uniqueSuffix}`;
    
    // Pre-generate IDs to avoid interactive transaction dependency
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    const tempUser = {
      id: userId,
      email: data.email,
      tenantId: tenantId,
      role: Role.OWNER
    };

    const tokens = await this.generateTokens(tempUser);
    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);

    // Create Default Pipeline Stages
    const defaultStages = ['New Lead', 'Contacted', 'Viewing', 'Negotiation', 'Closed'];

    await this.prisma.$transaction([
      this.prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'New Workspace',
          slug: tenantSlug,
        },
      }),
      this.prisma.user.create({
        data: {
          id: userId,
          email: data.email,
          passwordHash,
          firstName: data.email.split('@')[0],
          lastName: 'Admin',
          role: Role.OWNER,
          status: UserStatus.ACTIVE,
          tenantId: tenantId,
          refreshToken: hashedRefreshToken,
        },
      }),
      ...defaultStages.map((name, index) => 
        this.prisma.pipelineStage.create({
          data: {
            name,
            order: index,
            tenantId: tenantId,
          },
        })
      )
    ]);

    const user = await this.usersService.findById(userId);
    const { passwordHash: _, refreshToken: __, ...userResult } = user;

    return {
      user: userResult,
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshToken) throw new UnauthorizedException('Access denied');
      if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('Account inactive');

      const refreshMatches = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!refreshMatches) throw new UnauthorizedException('Access denied');

      const tokens = await this.generateTokens(user);
      await this.usersService.updateRefreshToken(user.id, await bcrypt.hash(tokens.refreshToken, 10));

      const { passwordHash, refreshToken: rt, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, ...tokens };
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  private async generateTokens(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      tenantId: user.tenantId,
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    return { accessToken, refreshToken };
  }
}
