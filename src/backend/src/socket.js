import { Server } from 'socket.io';

let io = null;

export function initSocket(server, opts = {}) {
  if (io) return io;
  io = new Server(server, opts);

  io.on('connection', (socket) => {
    console.log('[socket] client connected', socket.id);

    // allow clients to join project rooms
    socket.on('join', ({ projectId } = {}) => {
      if (projectId) {
        const room = String(projectId);
        socket.join(room);
        console.log(`[socket] ${socket.id} joined room ${room}`);
        // ack client
        socket.emit('socket:joined', { projectId: room });
      }
    });

    socket.on('leave', ({ projectId } = {}) => {
      if (projectId) {
        const room = String(projectId);
        socket.leave(room);
        console.log(`[socket] ${socket.id} left room ${room}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] client disconnected', socket.id, reason);
    });
  });

  return io;
}

export function getIO() {
  return io;
}
