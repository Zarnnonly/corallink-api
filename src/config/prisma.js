// Instance PrismaClient tunggal (biar tidak buka banyak koneksi ke DB)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
