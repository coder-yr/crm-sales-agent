import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Prisma, Role, UserStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(tenantId: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { 
        tenantId,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });
  }

  async inviteUser(tenantId: string, data: { email: string; firstName: string; lastName: string; role: Role; title?: string }) {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...data,
          tenantId,
          status: UserStatus.INVITED,
        },
      });

      const invite = await tx.userInvite.create({
        data: {
          email: data.email,
          token,
          role: data.role,
          title: data.title,
          tenantId,
          expiresAt,
        },
      });

      return { user, invite };
    });
  }

  async getInviteByToken(token: string) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    return invite;
  }

  async activateUser(token: string, passwordHash: string) {
    const invite = await this.getInviteByToken(token);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { email: invite.email },
        data: {
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.userInvite.delete({
        where: { id: invite.id },
      });

      return user;
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  async updateStatus(tenantId: string, userId: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id: userId, tenantId },
      data: { status },
    });
  }
}
