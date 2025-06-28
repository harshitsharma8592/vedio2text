const express = require('express');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Routes
const transcriptRoutes = require('./routes/transcriptRoutes');
const liveRoutes = require('./routes/liveRoutes');
const authRoutes = require('./routes/auth');

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// WebSocket Setup
const wss = new WebSocketServer({
  server,
  path: '/api/live',
  clientTracking: true,
});

// Heartbeat for dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Terminating inactive connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      const youtubeUrl = parsed?.youtubeUrl;
      
      if (!youtubeUrl) throw new Error('YouTube URL is required');

      console.log(`🎙️ Starting live transcription for: ${youtubeUrl}`);
      const { startLiveTranscription } = require('./controllers/liveController');
      
      // Pass channel info if available in the message
      await startLiveTranscription(
        ws, 
        youtubeUrl,
        parsed?.channelName,
        parsed?.channelUrl
      );
    } catch (err) {
      console.error('❗ WebSocket error:', err);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: err.message || 'Invalid message format',
        }));
      }
    }
  });

  ws.on('close', () => {
    console.log('❎ WebSocket client disconnected');
  });

  ws.on('error', (err) => {
    console.error('🚨 WebSocket connection error:', err);
  });
});

server.on('close', () => {
  clearInterval(interval);
});

// 📦 REST API Routes
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/live', liveRoutes(server, wss));
app.use('/api/auth', authRoutes); // ✅ Register auth routes

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('🧯 Express error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🌐 WebSocket server at ws://localhost:${PORT}/api/live`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close();
});
