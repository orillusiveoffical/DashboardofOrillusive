import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config } from '../config/index.js';

let io: SocketIOServer | null = null;

export function initSocketManager(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join_tenant_room', (tenantId: string) => {
      if (tenantId) {
        socket.join(`tenant_${tenantId}`);
        console.log(`Socket ${socket.id} joined tenant room: tenant_${tenantId}`);
      }
    });

    socket.on('leave_tenant_room', (tenantId: string) => {
      if (tenantId) {
        socket.leave(`tenant_${tenantId}`);
      }
    });

    socket.on('disconnect', () => {
      // Disconnected
    });
  });

  console.log('Socket.IO real-time manager initialized.');
  return io;
}

export function getSocketManager() {
  return {
    emitNotification: (tenantId: string, notification: any) => {
      if (io) {
        io.to(`tenant_${tenantId}`).emit('new_notification', notification);
      }
    },
    emitCalendarUpdate: (tenantId: string, data: any) => {
      if (io) {
        io.to(`tenant_${tenantId}`).emit('calendar_updated', data);
      }
    },
    emitRoomStatusUpdate: (tenantId: string, data: any) => {
      if (io) {
        io.to(`tenant_${tenantId}`).emit('room_status_changed', data);
      }
    },
    emitOtaSyncUpdate: (tenantId: string, data: any) => {
      if (io) {
        io.to(`tenant_${tenantId}`).emit('ota_sync_status', data);
      }
    },
  };
}
