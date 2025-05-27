import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class GastosGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionGastos() {
    this.server.emit('gastos-actualizadas');
  }
}
