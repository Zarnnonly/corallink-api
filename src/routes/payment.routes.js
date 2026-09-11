const { paymentSettings, qrisPath } = require('../utils/paymentSettings');
const router = require('express').Router();
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { success, error } = require('../utils/response');
router.get('/settings', async (req, res, next) => {
  try { return success(res, 'Metode pembayaran', await paymentSettings()); } catch (e) { next(e); }
});
router.get('/qris', (req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' });
  res.sendFile(qrisPath(), err => { if (err && !res.headersSent) next(err); });
});
router.put('/settings', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = z.object({ bankName: z.string().trim().min(2).max(100), accountNumber: z.string().trim().regex(/^[0-9 -]{5,100}$/), accountHolder: z.string().trim().min(2).max(191) }).safeParse(req.body);
    if (!parsed.success) return error(res, 'Isi bank, nomor rekening, dan nama pemilik yang valid.', 400);
    await prisma.paymentSettings.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
    return success(res, 'Rekening tersimpan', await paymentSettings());
  } catch (e) { next(e); }
});
module.exports = router;
