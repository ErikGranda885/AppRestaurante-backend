import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ProductosGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionProductos() {
    this.server.emit('productos-actualizados');
  }
}
