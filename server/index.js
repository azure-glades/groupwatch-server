const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// In production we’ll point this at ../client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join-room', room => {
    socket.join(room);
    socket.to(room).emit('user-joined', socket.id);
  });

    // forward any WebRTC signalling to the whole room
    socket.on('signal', ({ room, data, target }) => {
      socket.to(target || room).emit('signal', { sender: socket.id, data });
    });

  socket.on('chat', ({ room, text }) => {
    // broadcast to everyone in that room except sender
    socket.to(room).emit('chat', { text, from: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));