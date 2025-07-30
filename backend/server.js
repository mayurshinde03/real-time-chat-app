const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://your-chat-app.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// Your existing socket code...
let globalUsers = new Map();

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  
  socket.on('userJoined', (data) => {
    const { username, country } = data;
    globalUsers.set(socket.id, { username, country, socketId: socket.id });
    
    io.emit('onlineCount', globalUsers.size);
    io.emit('onlineUsers', Array.from(globalUsers.values()));
    
    socket.broadcast.emit('userJoined', {
      user: username,
      country: country,
      message: `${username} joined from ${country}`
    });
  });

  socket.on('sendMessage', (message) => {
    const user = globalUsers.get(socket.id);
    if (user) {
      const globalMessage = {
        ...message,
        user: user.username,
        country: user.country,
        timestamp: new Date().toLocaleTimeString()
      };
      io.emit('receiveMessage', globalMessage);
    }
  });

  socket.on('disconnect', () => {
    const user = globalUsers.get(socket.id);
    if (user) {
      globalUsers.delete(socket.id);
      io.emit('onlineCount', globalUsers.size);
      io.emit('onlineUsers', Array.from(globalUsers.values()));
      socket.broadcast.emit('userLeft', {
        user: user.username,
        message: `${user.username} left the chat`
      });
    }
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Global Chat Server is running!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
