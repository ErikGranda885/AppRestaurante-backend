import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // o coloca tu frontend: 'http://localhost:3000'
  },
})
export class VentasGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionVentas() {
    this.server.emit('ventas-actualizadas');
  }
}
