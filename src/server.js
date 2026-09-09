require('dotenv').config();
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const donationRoutes = require('./routes/donation.routes');
const { errorHandler } = require('./middleware/errorHandler.middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Biar foto yang diupload bisa diakses lewat URL, misal:
// http://localhost:3000/uploads/namafile.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan', data: null });
});

// Error handler (harus paling bawah)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 CoralLink API berjalan di http://localhost:${PORT}`);
});
