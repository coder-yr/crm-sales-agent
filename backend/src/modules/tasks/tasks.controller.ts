import { Controller, Get, Post, Body, Patch, Param, Query, Delete } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async create(@GetUser() user: any, @Body() createDto: CreateTaskDto) {
    const data = await this.tasksService.create(user.tenantId, user.userId, createDto);
    return { success: true, data, message: 'Task created successfully' };
  }

  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async findAll(@GetUser() user: any, @Query() query: PaginationQueryDto) {
    const data = await this.tasksService.findAll(user.tenantId, user, query.page, query.limit);
    return { success: true, ...data, message: 'Tasks fetched successfully' };
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateDto: UpdateTaskDto) {
    const data = await this.tasksService.update(user.tenantId, id, user, updateDto);
    return { success: true, data, message: 'Task updated successfully' };
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.EMPLOYEE)
  async remove(@GetUser() user: any, @Param('id') id: string) {
    await this.tasksService.remove(user.tenantId, id, user);
    return { success: true, message: 'Task deleted successfully' };
  }
}
