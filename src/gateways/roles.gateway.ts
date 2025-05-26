import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class RolesGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionRoles() {
    this.server.emit('roles-actualizados');
  }
}
