import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findAll(@GetUser() user: any, @Query() query: PaginationQueryDto) {
    const data = await this.notificationsService.findAll(user.tenantId, user.userId, query.page, query.limit);
    return { success: true, ...data, message: 'Notifications fetched successfully' };
  }

  @Patch(':id/read')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async markAsRead(@GetUser() user: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(user.tenantId, user.userId, id);
    return { success: true, message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async markAllAsRead(@GetUser() user: any) {
    await this.notificationsService.markAllAsRead(user.tenantId, user.userId);
    return { success: true, message: 'All notifications marked as read' };
  }
}
