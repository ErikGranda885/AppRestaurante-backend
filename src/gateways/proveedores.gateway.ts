import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ProveedoresGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionProveedores() {
    this.server.emit('proveedores-actualizados');
  }
}
