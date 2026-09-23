import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  async create(@GetUser() user: any, @Body() createCompanyDto: CreateCompanyDto) {
    const data = await this.companiesService.create(user.tenantId, createCompanyDto);
    return { success: true, data, message: 'Company created successfully' };
  }

  @Get()
  async findAll(@GetUser() user: any) {
    const data = await this.companiesService.findAll(user.tenantId);
    return { success: true, data, message: 'Companies fetched successfully' };
  }

  @Get(':id')
  async findOne(@GetUser() user: any, @Param('id') id: string) {
    const data = await this.companiesService.findOne(user.tenantId, id);
    return { success: true, data, message: 'Company fetched successfully' };
  }

  @Patch(':id')
  async update(@GetUser() user: any, @Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    const data = await this.companiesService.update(user.tenantId, id, updateCompanyDto);
    return { success: true, data, message: 'Company updated successfully' };
  }

  @Delete(':id')
  async remove(@GetUser() user: any, @Param('id') id: string) {
    await this.companiesService.remove(user.tenantId, id);
    return { success: true, message: 'Company deleted successfully' };
  }
}
