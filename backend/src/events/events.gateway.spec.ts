import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('EventsGateway - Security Validation', () => {
  let gateway: EventsGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('secret') },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should join tenant room ONLY if user is OWNER or MANAGER', async () => {
    const mockClient = {
      handshake: { auth: { token: 'Bearer valid_token' } },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    jest.spyOn(jwtService, 'verify').mockReturnValue({
      sub: 'manager-id',
      tenantId: 'tenant-1',
      role: 'MANAGER',
    });

    await gateway.handleConnection(mockClient);

    expect(mockClient.join).toHaveBeenCalledWith('tenant_tenant-1');
    expect(mockClient.join).toHaveBeenCalledWith('user_manager-id');
  });

  it('should NOT join tenant room if user is EMPLOYEE', async () => {
    const mockClient = {
      handshake: { auth: { token: 'Bearer valid_token' } },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    jest.spyOn(jwtService, 'verify').mockReturnValue({
      sub: 'employee-id',
      tenantId: 'tenant-1',
      role: 'EMPLOYEE',
    });

    await gateway.handleConnection(mockClient);

    expect(mockClient.join).not.toHaveBeenCalledWith('tenant_tenant-1');
    expect(mockClient.join).toHaveBeenCalledWith('user_employee-id');
  });
});
