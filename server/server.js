require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');

const app = express();

const allowedOrigins = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  process.env.CLIENT_ORIGIN,
].filter(Boolean));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'vibefeed-server', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
