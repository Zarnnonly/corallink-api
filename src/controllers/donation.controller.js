const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

// Legacy donation creation is retired. All new payments use transactions and proof review.
async function createDonation(req, res) {
  return error(res, 'Pengiriman donasi lama sudah dinonaktifkan. Gunakan alur pembayaran proyek dan unggah bukti pembayaran untuk ditinjau admin.', 410);
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
