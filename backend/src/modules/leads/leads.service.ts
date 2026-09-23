import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { Role, UserStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('events-queue') private eventsQueue: Queue
  ) {}

  async create(tenantId: string, userId: string, createLeadDto: CreateLeadDto) {
    // Duplicate check
    if (createLeadDto.email || createLeadDto.phone) {
      const existingLead = await this.prisma.lead.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            ...(createLeadDto.email ? [{ email: createLeadDto.email }] : []),
            ...(createLeadDto.phone ? [{ phone: createLeadDto.phone }] : []),
          ],
        },
      });

      if (existingLead) {
        throw new ConflictException(
          `Lead with this ${existingLead.email === createLeadDto.email ? 'email' : 'phone'} already exists in your database.`
        );
      }
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: createLeadDto.stageId, tenantId },
    });
    if (!stage) {
      throw new NotFoundException('Pipeline stage not found in this workspace');
    }

    // Check if the user is an employee to auto-assign
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const assigneeId = createLeadDto.assigneeId || (user?.role === Role.EMPLOYEE ? userId : undefined);

    if (assigneeId) {
      const assignedUser = await this.prisma.user.findFirst({
        where: { id: assigneeId, tenantId },
      });
      if (!assignedUser) {
        throw new NotFoundException('Assigned user not found in this workspace');
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        ...createLeadDto,
        tenantId,
        creatorId: userId,
        assigneeId,
      },
    });

    if (assigneeId) {
      await this.prisma.leadAssignmentHistory.create({
        data: {
          tenantId,
          leadId: lead.id,
          userId: assigneeId,
        },
      });
    }

    await this.eventsQueue.add('log.activity', {
      tenantId,
      type: 'LEAD_CREATED',
      data: { leadId: lead.id, userId },
    });

    if (assigneeId) {
      await this.eventsQueue.add('log.activity', {
        tenantId,
        type: 'LEAD_ASSIGNED',
        data: { leadId: lead.id, userId, metadata: { assigneeId } },
      });
      await this.eventsQueue.add('send.notification', {
        tenantId,
        data: {
          userId: assigneeId,
          title: 'New Lead Assigned',
          message: `You have been assigned a new lead: ${lead.firstName} ${lead.lastName}`,
        },
      });
    }

    return lead;
  }

  async findAll(tenantId: string, user: any, page: number = 1, limit: number = 50, stageId?: string, search?: string) {
    const skip = (page - 1) * limit;
    let whereClause: any = { tenantId, deletedAt: null };

    if (user.role === Role.EMPLOYEE) {
      whereClause.assigneeId = user.userId;
    }
    
    if (stageId) {
      whereClause.stageId = stageId;
    }

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { stage: true, assignee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where: whereClause }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(tenantId: string, leadId: string, user: any) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      include: { stage: true, assignee: true, creator: true },
    });

    if (!lead) throw new NotFoundException('Lead not found');

    if (user.role === Role.EMPLOYEE && lead.assigneeId !== user.userId) {
      throw new ForbiddenException('Access denied');
    }

    return lead;
  }

  async update(tenantId: string, leadId: string, user: any, updateLeadDto: UpdateLeadDto) {
    const { version, ...data } = updateLeadDto;
    const lead = await this.findOne(tenantId, leadId, user); // Check access

    const where: any = { id: leadId, tenantId };
    if (version) where.version = version;

    try {
      const updatedLead = await this.prisma.lead.update({
        where,
        data: {
          ...data,
          version: { increment: 1 },
        },
      });

      await this.eventsQueue.add('log.activity', {
        tenantId,
        type: 'LEAD_UPDATED',
        data: { leadId, userId: user.userId, metadata: { updates: Object.keys(data) } },
      });

      return updatedLead;
    } catch (e) {
      if (e.code === 'P2025') {
        throw new ConflictException('Concurrency conflict: Lead has been modified by another user');
      }
      throw e;
    }
  }

  async changeStage(tenantId: string, leadId: string, user: any, changeStageDto: ChangeStageDto) {
    const { version, stageId } = changeStageDto;
    const lead = await this.findOne(tenantId, leadId, user); // Check access

    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, tenantId },
    });
    if (!targetStage) throw new NotFoundException('Target pipeline stage not found');

    const where: any = { id: leadId, tenantId };
    if (version) where.version = version;

    try {
      const updatedLead = await this.prisma.lead.update({
        where,
        data: { 
          stageId,
          version: { increment: 1 },
        },
      });

      await this.eventsQueue.add('log.activity', {
        tenantId,
        type: 'STAGE_CHANGED',
        data: { leadId, userId: user.userId, metadata: { newStageId: stageId } },
      });

      return updatedLead;
    } catch (e) {
      if (e.code === 'P2025') {
        throw new ConflictException('Concurrency conflict: Lead stage has been modified by another user');
      }
      throw e;
    }
  }

  async assign(tenantId: string, leadId: string, user: any, assigneeId: string, version?: number) {
    const lead = await this.findOne(tenantId, leadId, user); // Check access

    const targetUser = await this.prisma.user.findFirst({
      where: { id: assigneeId, tenantId },
    });
    if (!targetUser) throw new NotFoundException('Assigned user not found in this workspace');

    const where: any = { id: leadId, tenantId };
    if (version) where.version = version;

    try {
      const updatedLead = await this.prisma.lead.update({
        where,
        data: { 
          assigneeId,
          version: { increment: 1 },
        },
      });

      // Track history
      await this.prisma.leadAssignmentHistory.create({
        data: {
          tenantId,
          leadId,
          userId: assigneeId,
        },
      });

      await this.eventsQueue.add('log.activity', {
        tenantId,
        type: 'LEAD_ASSIGNED',
        data: { leadId, userId: user.userId, metadata: { assigneeId } },
      });

      await this.eventsQueue.add('send.notification', {
        tenantId,
        data: {
          userId: assigneeId,
          title: 'Lead Reassigned',
          message: `Lead ${lead.firstName} ${lead.lastName} has been assigned to you.`,
        },
      });

      return updatedLead;
    } catch (e) {
      if (e.code === 'P2025') {
        throw new ConflictException('Concurrency conflict: Lead has been modified by another user');
      }
      throw e;
    }
  }

  async remove(tenantId: string, leadId: string, user: any) {
    await this.findOne(tenantId, leadId, user); // Check access
    const lead = await this.prisma.lead.update({
      where: { id: leadId, tenantId },
      data: { deletedAt: new Date() },
    });

    await this.eventsQueue.add('log.activity', {
      tenantId,
      type: 'LEAD_DELETED',
      data: { leadId, userId: user.userId },
    });

    return lead;
  }

  async bulkUpload(tenantId: string, userId: string, file: any) {
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        throw new BadRequestException('The uploaded file is empty');
      }

      // Get default stage
      const defaultStage = await this.prisma.pipelineStage.findFirst({
        where: { tenantId },
        orderBy: { order: 'asc' },
      });

      if (!defaultStage) {
        throw new BadRequestException('No pipeline stages found for this tenant. Please create stages first.');
      }

      // Get active agents for round-robin assignment
      const agents = await this.prisma.user.findMany({
        where: { 
          tenantId, 
          role: { in: [Role.EMPLOYEE, Role.MANAGER] },
          status: UserStatus.ACTIVE 
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get existing leads to avoid duplicates
      const existingLeads = await this.prisma.lead.findMany({
        where: { tenantId, deletedAt: null },
        select: { email: true, phone: true }
      });

      const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
      const existingPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean));

      const leadsData = [];
      let skippedDuplicates = 0;

      rows.forEach((row, index) => {
        const email = row.email || row.Email || row['Email Address'] || null;
        const phone = row.phone || row.Phone || row['Phone Number'] || row.Mobile || row.Contact || null;

        // Skip if duplicate exists in DB or within the current batch
        if ((email && existingEmails.has(email)) || (phone && existingPhones.has(phone))) {
          skippedDuplicates++;
          return;
        }

        if (email) existingEmails.add(email);
        if (phone) existingPhones.add(phone);

        const assigneeId = agents.length > 0 ? agents[index % agents.length].id : null;
        
        // Robust parsing for budget (strips symbols and commas)
        const rawBudget = String(row.budget || row.Budget || row.Price || row['Budget (₹)'] || '0');
        const parsedBudget = parseFloat(rawBudget.replace(/[^\d.]/g, '')) || 0;

        leadsData.push({
          tenantId,
          creatorId: userId,
          firstName: row.firstName || row['First Name'] || 'Unknown',
          lastName: row.lastName || row['Last Name'] || '',
          email,
          phone,
          source: row.source || row.Source || 'Bulk Upload',
          notes: row.notes || row.Notes || row['Internal Notes'] || '',
          budget: parsedBudget,
          interestedProperty: row.interestedProperty || row['Interested Property'] || row.Property || row.Requirement || null,
          preapprovalStatus: row.preapprovalStatus || row['Pre-Approval Status'] || row.Status || null,
          expectedCloseDate: (row.expectedCloseDate || row['Expected Close Date']) ? new Date(row.expectedCloseDate || row['Expected Close Date']).toISOString() : null,
          location: row.location || row.Location || row.City || row.Area || row.Address || null,
          stageId: defaultStage.id,
          assigneeId,
        });
      });

      if (leadsData.length === 0) {
        return { count: 0, message: 'All leads in the file were identified as duplicates and skipped.' };
      }

      const createdLeads = await this.prisma.$transaction(
        leadsData.map(data => this.prisma.lead.create({ data }))
      );

      // Create assignment history for each lead if assigned
      await this.prisma.leadAssignmentHistory.createMany({
        data: createdLeads
          .filter(l => l.assigneeId)
          .map(l => ({
            tenantId,
            leadId: l.id,
            userId: l.assigneeId as string,
          }))
      });

      await this.eventsQueue.add('log.activity', {
        tenantId,
        type: 'BULK_LEADS_UPLOADED',
        data: { userId, metadata: { count: createdLeads.length } },
      });

      return { 
        count: createdLeads.length, 
        skippedDuplicates,
        message: `${createdLeads.length} leads created. ${skippedDuplicates} duplicates were skipped.`
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Bulk upload error:', error);
      throw new BadRequestException('Failed to parse lead file. Ensure headers are correct (firstName, lastName, email, phone)');
    }
  }
}
