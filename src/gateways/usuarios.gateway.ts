import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // o coloca tu frontend: 'http://localhost:3000'
  },
})
export class UsuariosGateway {
  @WebSocketServer()
  server: Server;

  emitirActualizacionUsuarios() {
    this.server.emit('usuarios-actualizados');
  }
}
