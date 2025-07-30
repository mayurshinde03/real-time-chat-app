const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://*.vercel.app",
      /https:\/\/.*\.vercel\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://*.vercel.app",
    /https:\/\/.*\.vercel\.app$/
  ],
  credentials: true
}));

app.use(express.json());

// Store connected users and message history
let globalUsers = new Map();
let messageHistory = [];
const MAX_HISTORY = 50;

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: '💬 Global Chat Server is running!',
    status: 'success',
    onlineUsers: globalUsers.size,
    totalMessages: messageHistory.length,
    timestamp: new Date(),
    version: '3.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    onlineUsers: globalUsers.size,
    messageCount: messageHistory.length
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔗 New connection: ${socket.id}`);

  // Send recent message history to new user
  if (messageHistory.length > 0) {
    socket.emit('messageHistory', messageHistory.slice(-20));
  }

  // Send current online count
  socket.emit('onlineCount', globalUsers.size);
  socket.emit('onlineUsers', Array.from(globalUsers.values()));

  // Handle user joining
  socket.on('userJoined', (data) => {
    try {
      const { username, country = 'Unknown' } = data;
      
      if (!username || username.trim().length < 2) {
        socket.emit('error', 'Username must be at least 2 characters');
        return;
      }

      const userInfo = {
        username: username.trim(),
        country: country,
        socketId: socket.id,
        joinTime: new Date().toISOString()
      };

      globalUsers.set(socket.id, userInfo);
      
      console.log(`👤 ${userInfo.username} from ${userInfo.country} joined (Total: ${globalUsers.size})`);

      // Update all clients with new user count and list
      io.emit('onlineCount', globalUsers.size);
      io.emit('onlineUsers', Array.from(globalUsers.values()));
      
      // Broadcast join notification
      const joinMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: `${userInfo.username} joined from ${userInfo.country}`,
        timestamp: new Date().toISOString(),
        user: 'System'
      };

      messageHistory.push(joinMessage);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }

      io.emit('receiveMessage', joinMessage);
      
    } catch (error) {
      console.error('Error in userJoined:', error);
      socket.emit('error', 'Failed to join chat');
    }
  });

  // Handle messages
  socket.on('sendMessage', (messageData) => {
    try {
      const user = globalUsers.get(socket.id);
      
      if (!user) {
        socket.emit('error', 'Please join the chat first');
        return;
      }

      if (!messageData.text || messageData.text.trim().length === 0) {
        socket.emit('error', 'Message cannot be empty');
        return;
      }

      if (messageData.text.trim().length > 500) {
        socket.emit('error', 'Message too long (max 500 characters)');
        return;
      }

      const message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        text: messageData.text.trim(),
        user: user.username,
        country: user.country,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      };

      // Add to message history
      messageHistory.push(message);
      if (messageHistory.length > MAX_HISTORY) {
        messageHistory.shift();
      }

      console.log(`💬 Message from ${user.username}: ${message.text}`);
      
      // Broadcast message to all connected clients
      io.emit('receiveMessage', message);
      
    } catch (error) {
      console.error('Error in sendMessage:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const user = globalUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('userTyping', {
        username: user.username,
        isTyping: data.isTyping
      });
    }
  });

  // Handle user leaving
  socket.on('userLeft', (username) => {
    const user = globalUsers.get(socket.id);
    if (user) {
      console.log(`👋 ${user.username} left the chat`);
      
      globalUsers.delete(socket.id);
      
      // Update all clients
      io.emit('onlineCount', globalUsers.size);
      io.emit('onlineUsers', Array.from(globalUsers.values()));
      
      // Broadcast leave notification
      const leaveMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
        user: 'System'
      };

      messageHistory.push(leaveMessage);
      io.emit('receiveMessage', leaveMessage);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = globalUsers.get(socket.id);
    if (user) {
      console.log(`👋 ${user.username} disconnected (Total: ${globalUsers.size - 1})`);
      
      globalUsers.delete(socket.id);
      
      // Update all clients
      io.emit('onlineCount', globalUsers.size);
      io.emit('onlineUsers', Array.from(globalUsers.values()));
      
      // Broadcast leave notification
      const leaveMessage = {
        id: `system-${Date.now()}`,
        type: 'system',
        text: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
        user: 'System'
      };

      messageHistory.push(leaveMessage);
      io.emit('receiveMessage', leaveMessage);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`💬 Global Chat Server running on port ${PORT}`);
  console.log(`🚀 Ready for worldwide connections!`);
  console.log(`📊 Server started at ${new Date().toISOString()}`);
});
