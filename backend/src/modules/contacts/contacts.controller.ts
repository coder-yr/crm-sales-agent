import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(@GetUser() user: any, @Body() createContactDto: CreateContactDto) {
    const data = await this.contactsService.create(user.tenantId, createContactDto);
    return { success: true, data, message: 'Contact created successfully' };
  }

  @Get()
  async findAll(@GetUser() user: any) {
    const data = await this.contactsService.findAll(user.tenantId);
    return { success: true, data, message: 'Contacts fetched successfully' };
  }

  @Get(':id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.contactsService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Contact fetched successfully' };
  }

  @Patch(':id')
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    const data = await this.contactsService.update(user.tenantId, id, updateContactDto);
    return { success: true, data, message: 'Contact updated successfully' };
  }

  @Delete(':id')
  async remove(@GetUser() user: any, @Param('id') id: string) {
    await this.contactsService.remove(user.tenantId, id);
    return { success: true, message: 'Contact deleted successfully' };
  }
}
