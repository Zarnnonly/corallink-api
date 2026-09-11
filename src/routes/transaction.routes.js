const { paymentSettings } = require('../utils/paymentSettings');
const router = require('express').Router();
const path = require('path');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');
const { success, error } = require('../utils/response');
const { saveImage, removeImage, root } = require('../utils/files');
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const include = { project: { select: { namaProyek: true, lokasi: true } } };
const view = t => { const { proofFile, ...data } = t; return { ...data, hasProof: Boolean(proofFile) }; };
router.use(authenticate);
router.get('/me', requireRole('investor'), wrap(async (req, res) => {
  const data = await prisma.transaction.findMany({ where: { investorId: req.user.id }, include, orderBy: { createdAt: 'desc' } });
  return success(res, 'Riwayat pembayaran', data.map(view));
}));
router.get('/', requireRole('admin'), wrap(async (req, res) => {
  const data = await prisma.transaction.findMany({ where: { status: { in: ['Pending', 'Completed', 'Failed'] }, proofFile: { not: null, notIn: [''] } }, include: { ...include, investor: { select: { nama: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  return success(res, 'Pembayaran terbaru (maksimal 500)', data.map(view));
}));
router.post('/', requireRole('investor'), wrap(async (req, res) => {
  const parsed = z.object({ projectId: z.coerce.number().int().positive(), amount: z.coerce.number().positive().max(9999999999).multipleOf(0.01), idempotencyKey: z.string().uuid(), type: z.enum(['One-Time Contribution', 'Monthly Contribution']).default('One-Time Contribution'), contributorName: z.string().trim().min(2).max(191).optional(), contributorEmail: z.string().email().max(191).optional() }).safeParse(req.body);
  if (!parsed.success) return error(res, 'Proyek, nominal, atau ID permintaan tidak valid', 400);
  const { projectId, amount, idempotencyKey, type, contributorName, contributorEmail } = parsed.data;
  const existing = await prisma.transaction.findUnique({ where: { idempotencyKey }, include });
  if (existing) {
    if (existing.investorId !== req.user.id || existing.projectId !== projectId || Number(existing.amount) !== amount || existing.type !== type) return error(res, 'ID permintaan sudah digunakan', 409);
    return success(res, 'Permintaan sudah dibuat', view(existing));
  }
  if (!(await paymentSettings()).enabled) return error(res, 'Metode pembayaran belum diatur admin', 503);
  if (!await prisma.project.findUnique({ where: { id: projectId } })) return error(res, 'Proyek tidak ditemukan', 404);
  try {
    const data = await prisma.transaction.create({ data: { projectId, amount, idempotencyKey, type, contributorName, contributorEmail, investorId: req.user.id, status: 'AwaitingProof' }, include });
    return success(res, 'Permintaan dibuat; belum dibayar', view(data), 201);
  } catch (e) { if (e.code === 'P2002') return error(res, 'Permintaan sedang diproses. Coba lagi dengan ID yang sama.', 409); throw e; }
}));
router.get('/:id', wrap(async (req, res) => {
  const data = await prisma.transaction.findUnique({ where: { id: req.params.id }, include });
  if (!data || (req.user.role !== 'admin' && data.investorId !== req.user.id)) return error(res, 'Transaksi tidak ditemukan', 404);
  return success(res, 'Detail pembayaran', view(data));
}));
router.get('/:id/proof', wrap(async (req, res) => {
  const data = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!data?.proofFile || (req.user.role !== 'admin' && data.investorId !== req.user.id)) return error(res, 'Bukti tidak ditemukan', 404);
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  return res.sendFile(path.join(root, 'private', path.basename(data.proofFile)));
}));
router.post('/:id/proof', requireRole('investor'), upload.single('image'), wrap(async (req, res) => {
  const data = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!data || data.investorId !== req.user.id) return error(res, 'Transaksi tidak ditemukan', 404);
  if (!['AwaitingProof', 'Failed'].includes(data.status)) return error(res, 'Bukti sedang ditinjau atau pembayaran sudah selesai', 409);
  if (!req.file?.size) return error(res, 'Unggah bukti pembayaran JPG, PNG, atau WEBP sebelum mengirim pembayaran.', 400);
  let file; let committed = false;
  try {
    file = await saveImage(req.file, 'private');
    const updated = await prisma.transaction.updateMany({ where: { id: data.id, status: data.status }, data: { proofFile: file.filename, status: 'Pending', reviewedBy: null, reviewedAt: null, reviewNote: null } });
    if (!updated.count) { await removeImage(file); return error(res, 'Transaksi berubah. Muat ulang.', 409); }
    committed = true;
    if (data.proofFile) await removeImage({ fullPath: path.join(root, 'private', path.basename(data.proofFile)) });
    return success(res, 'Bukti terkirim, menunggu verifikasi admin', view(await prisma.transaction.findUnique({ where: { id: data.id }, include })));
  } catch (e) { if (!committed) await removeImage(file); throw e; }
}));
router.put('/:id/status', requireRole('admin'), wrap(async (req, res) => {
  const parsed = z.object({ status: z.enum(['Completed', 'Failed']), note: z.string().trim().max(2000).optional() }).safeParse(req.body);
  if (!parsed.success || (parsed.data.status === 'Failed' && !parsed.data.note)) return error(res, 'Status atau alasan penolakan tidak valid', 400);
  const updated = await prisma.transaction.updateMany({ where: { id: req.params.id, status: 'Pending', proofFile: { not: null, notIn: [''] } }, data: { status: parsed.data.status, reviewNote: parsed.data.note || '', reviewedBy: req.user.id, reviewedAt: new Date() } });
  if (!updated.count) return error(res, 'Hanya bukti berstatus Pending yang bisa diverifikasi. Muat ulang.', 409);
  return success(res, 'Verifikasi tersimpan', view(await prisma.transaction.findUnique({ where: { id: req.params.id }, include })));
}));
module.exports = router;
