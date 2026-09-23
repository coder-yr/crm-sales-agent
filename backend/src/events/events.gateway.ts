import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.auth.token;
      let token = authHeader;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
      
      if (!token) {
        client.disconnect();
        return;
      }
      
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });

      // Join tenant specific room for authorized tenant members
      if (payload.tenantId) {
        client.join(`tenant_${payload.tenantId}`);
      }
      // Join user specific room
      client.join(`user_${payload.sub}`);
      
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if necessary
  }

  emitToTenant(tenantId: string, event: string, data: any) {
    if (!this.server) return;
    this.server.to(`tenant_${tenantId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    if (!this.server) return;
    this.server.to(`user_${userId}`).emit(event, data);
  }
}
