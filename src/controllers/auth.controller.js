const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const registerSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(191),
  phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/, 'Nomor telepon tidak valid').optional(),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

// POST /api/auth/register
async function register(req, res) {
  const parsed = registerSchema.safeParse({ ...req.body, nama: req.body.nama ?? req.body.name });
  if (!parsed.success) {
    return error(res, parsed.error.errors[0].message, 400);
  }
  const { nama, email, password, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return error(res, 'Email sudah terdaftar', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { nama, email, phone: phone || null, password: hashedPassword, role: 'investor' },
  });

  const token = generateToken(user);

  return success(res, 'Registrasi berhasil', {
    user: { id: user.id, nama: user.nama, name: user.nama, phone: user.phone, email: user.email, role: user.role },
    token,
  }, 201);
}

// POST /api/auth/login
async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, parsed.error.errors[0].message, 400);
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return error(res, 'Email atau password salah', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return error(res, 'Email atau password salah', 401);
  }

  const token = generateToken(user);

  return success(res, 'Login berhasil', {
    user: { id: user.id, nama: user.nama, name: user.nama, phone: user.phone, email: user.email, role: user.role },
    token,
  });
}

// GET /api/auth/profile (butuh token)
async function profile(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, nama: true, phone: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    return error(res, 'User tidak ditemukan', 404);
  }

  return success(res, 'Profil berhasil diambil', user);
}

module.exports = { register, login, profile };
