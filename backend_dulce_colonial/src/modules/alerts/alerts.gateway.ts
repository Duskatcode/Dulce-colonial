import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/alerts',
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AlertsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  // Emite alerta de stock bajo a todos los clientes conectados
  emitStockAlert(alert: {
    entityType: string;
    entityName: string;
    currentStock: number;
    minStock: number;
  }) {
    this.server.emit('stock_alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
    this.logger.warn(
      `⚠️  Stock bajo: ${alert.entityName} (${alert.currentStock}/${alert.minStock})`,
    );
  }

  // Emite notificación general
  emitNotification(event: string, data: any) {
    this.server.emit(event, { ...data, timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { message: 'Conexión activa' });
  }
}
