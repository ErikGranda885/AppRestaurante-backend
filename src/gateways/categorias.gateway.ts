import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class CategoriasGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionCategorias() {
    this.server.emit('categorias-actualizadas');
  }
}
