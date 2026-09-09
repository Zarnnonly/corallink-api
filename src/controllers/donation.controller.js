const { z } = require('zod');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

const createDonationSchema = z.object({
  projectId: z.number().int().positive('projectId wajib diisi'),
  jumlahDonasi: z.number().positive('Jumlah donasi harus lebih dari 0'),
  pesanDukungan: z.string().optional(),
});

// POST /api/donations (investor)
async function createDonation(req, res) {
  const body = {
    ...req.body,
    projectId: Number(req.body.projectId),
    jumlahDonasi: Number(req.body.jumlahDonasi),
  };

  const parsed = createDonationSchema.safeParse(body);
  if (!parsed.success) {
    return error(res, parsed.error.errors[0].message, 400);
  }
  const { projectId, jumlahDonasi, pesanDukungan } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return error(res, 'Proyek tidak ditemukan', 404);
  }

  const donation = await prisma.donation.create({
    data: {
      projectId,
      investorId: req.user.id,
      jumlahDonasi,
      pesanDukungan,
    },
  });

  return success(res, 'Donasi berhasil dicatat', donation, 201);
}

// GET /api/donations/saya (investor - riwayat donasi milik sendiri)
async function getMyDonations(req, res) {
  const donations = await prisma.donation.findMany({
    where: { investorId: req.user.id },
    include: { project: { select: { namaProyek: true, lokasi: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return success(res, 'Riwayat donasi berhasil diambil', donations);
}

module.exports = { createDonation, getMyDonations };
