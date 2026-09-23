import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(Role.OWNER)
  async getSubscription(@GetUser() user: any) {
    const data = await this.subscriptionsService.getSubscription(user.tenantId);
    return { success: true, data, message: 'Subscription fetched successfully' };
  }
}
