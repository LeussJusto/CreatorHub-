require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setIO } = require('./utils/realtime');
const { connectDB } = require('./config/db');

const app = express();
const server = http.createServer(app);

// ⚙️ Configuración de CORS (permite conexión con tu frontend React)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
}));

// 🔐 Seguridad y logs
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// 🌐 Configuración de Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// ✅ Ruta de verificación del servidor
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor funcionando correctamente' });
});

// 🧩 Rutas principales de la API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/events', require('./routes/events.routes'));
app.use('/api/scripts', require('./routes/scripts.routes'));
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/integrations', require('./routes/integrations.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));

// ⚡ Configuración de sockets
setIO(io);

io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado al socket');

  socket.on('auth:identify', (token) => {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.join(`user:${payload.sub}`);
      console.log(`Usuario identificado: ${payload.sub}`);
    } catch {
      console.warn('Token inválido en socket');
    }
  });

  socket.on('joinProject', (projectId) => {
    socket.join(`project:${projectId}`);
  });

  socket.on('leaveProject', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('script:edit', ({ projectId, scriptId, ops }) => {
    if (!projectId || !scriptId) return;
    socket.to(`project:${projectId}`).emit('script:edit', { scriptId, ops });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado');
  });
});

// 🚀 Inicio del servidor y conexión a la base de datos
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    const connection = await connectDB(process.env.MONGODB_URI);
    console.log(`✅ MongoDB conectado correctamente: ${connection.name || 'default database'}`);
    server.listen(PORT, () => {
      console.log(`🚀 API escuchando en http://localhost:${PORT}`);
      console.log(`🌍 Permitiendo conexión desde: ${CLIENT_ORIGIN}`);
    });
  } catch (err) {
    console.error('❌ Error al conectar con MongoDB:', err.message);
    process.exit(1);
  }
})();
