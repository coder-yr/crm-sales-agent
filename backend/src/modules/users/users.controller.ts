import { Controller, Get, Post, Patch, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, UserStatus } from '@prisma/client';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER)
  async findAll(@GetUser() user: any) {
    const data = await this.usersService.findAll(user.tenantId);
    return { success: true, data, message: 'Users fetched successfully' };
  }

  @Post('invite')
  @Roles(Role.OWNER, Role.MANAGER)
  async invite(@GetUser() currentUser: any, @Body() inviteUserDto: InviteUserDto) {
    const { user, invite } = await this.usersService.inviteUser(currentUser.tenantId, inviteUserDto);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteLink = `${frontendUrl}/activate?token=${invite.token}`;

    return { 
      success: true, 
      data: { ...user, inviteLink }, 
      message: 'Invitation sent successfully' 
    };
  }

  @Patch(':id/status')
  @Roles(Role.OWNER)
  async updateStatus(
    @GetUser() currentUser: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto
  ) {
    if (currentUser.userId === id) {
      throw new ForbiddenException('You cannot change your own status');
    }

    const data = await this.usersService.updateStatus(currentUser.tenantId, id, updateStatusDto.status);
    return { success: true, data, message: 'User status updated successfully' };
  }
}
