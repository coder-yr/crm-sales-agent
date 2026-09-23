import { PartialType } from '@nestjs/mapped-types';
import { CreateChannelPartnerDto } from './create-channel-partner.dto';

export class UpdateChannelPartnerDto extends PartialType(CreateChannelPartnerDto) {}
