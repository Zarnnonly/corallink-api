require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const donationRoutes = require('./routes/donation.routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');

const app = express();

app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(cors({
  origin: ['https://corallink.web.id', 'https://www.corallink.web.id'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Biar foto yang diupload bisa diakses lewat URL, misal:
// http://localhost:3000/uploads/namafile.jpg
app.use('/uploads/covers', express.static(path.join(require('./utils/files').root, 'covers'), { setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff') }));

// Health check - buat mastiin server hidup
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CoralLink API berjalan dengan baik 🌊',
    data: { version: '1.0.0' },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/transactions', require('./routes/transaction.routes'));
app.use('/api/payments', require('./routes/payment.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan', data: null });
});

// Error handler (harus paling bawah)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 CoralLink API berjalan di http://127.0.0.1:${PORT}`);
});

module.exports = app;
