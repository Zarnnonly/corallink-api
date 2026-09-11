const { z } = require('zod');
const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');
const { saveImage, removeImage } = require('../utils/files');
const optionalNumber = (schema) => z.preprocess(v => v === '' || v == null ? undefined : v, schema.optional());
const projectSchema = z.object({
  namaProyek: z.string().trim().min(2).max(191), lokasi: z.string().trim().min(2).max(191),
  tingkatKerusakan: z.string().trim().max(191).optional(), targetRestorasi: z.string().trim().max(191).optional(),
  description: z.string().trim().max(10000).optional(), species: z.string().trim().max(191).optional(),
  fundingTarget: optionalNumber(z.coerce.number().positive().max(999999999999).multipleOf(0.01)),
  duration: optionalNumber(z.coerce.number().int().positive().max(1200)),
  fragments: optionalNumber(z.coerce.number().int().positive().max(100000000)),
  area: optionalNumber(z.coerce.number().positive().max(1000000000)),
});
const defaultMilestones = () => [
  'Site Assessment & Coral Collection', 'Nursery Cultivation & Growth Monitoring',
  'Reef Transplantation', 'Monitoring & Reporting',
].map((title, i) => ({ phase: `Phase ${i + 1}`, title, months: '', status: 'Not Started', done: false }));
const milestoneSchema = z.object({
  version: z.number().int().nonnegative(), progressNote: z.string().trim().max(10000).optional(),
  milestones: z.array(z.object({ phase: z.string().min(1).max(50), title: z.string().min(1).max(191),
    months: z.string().max(100).optional().default(''), status: z.enum(['Not Started', 'In Progress', 'Complete']),
  })).min(1).max(20),
});
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
async function withFunding(projects) {
  const totals = await prisma.transaction.groupBy({ by: ['projectId'], where: { status: 'Completed', projectId: { in: projects.map(p => p.id) } }, _sum: { amount: true } });
  return projects.map(p => ({ ...p, fundingRaised: String(totals.find(t => t.projectId === p.id)?._sum.amount || 0) }));
}
const getAllProjects = wrap(async (req, res) => success(res, 'Berhasil mengambil data proyek', await withFunding(await prisma.project.findMany({ orderBy: { createdAt: 'desc' } }))));
const getProject = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return error(res, 'Proyek tidak ditemukan', 404);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return error(res, 'Proyek tidak ditemukan', 404);
  return success(res, 'Detail proyek', (await withFunding([project]))[0]);
});
const createProject = wrap(async (req, res) => {
  const parsed = projectSchema.safeParse({ ...req.body, namaProyek: req.body.namaProyek ?? req.body.name, lokasi: req.body.lokasi ?? req.body.location });
  if (!parsed.success) return error(res, parsed.error.errors[0].message, 400);
  let file;
  try {
    let analysis;
    if (req.file) {
      file = await saveImage(req.file, 'covers');
      const payload = new FormData(); payload.append('image', new Blob([file.buffer], { type: 'image/webp' }), 'coral.webp');
      try {
        const result = await fetch(process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000/predict', { method: 'POST', body: payload, signal: AbortSignal.timeout(20000) });
        const data = await result.json();
        if (result.ok && typeof data.predicted_class === 'string' && Number.isFinite(data.confidence) && data.confidence >= 0 && data.confidence <= 100) analysis = data;
      } catch { /* A missing analysis must never be treated as approval. */ }
      if (!analysis) throw Object.assign(new Error('Analisis AI tidak tersedia. Coba lagi.'), { statusCode: 503 });
      if (analysis.predicted_class !== 'Bleached') throw Object.assign(new Error('Proyek restorasi memerlukan gambar karang yang rusak atau memutih.'), { statusCode: 422 });
    }
    const project = await prisma.project.create({ data: {
      ...parsed.data, adminId: req.user.id, milestones: defaultMilestones(),
      ...(file ? { imageUrl: file.url } : {}),
      ...(analysis ? { aiStatus: analysis.predicted_class, confidenceScore: analysis.confidence, aiAnalysis: analysis } : {}),
    } });
    return success(res, 'Proyek berhasil dipublikasikan', project, 201);
  } catch (e) { await removeImage(file); throw e; }
});
const updateMilestones = wrap(async (req, res) => {
  const id = Number(req.params.id), parsed = milestoneSchema.safeParse(req.body);
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) return error(res, 'Data milestone tidak valid', 400);
  const data = parsed.data;
  const changed = await prisma.project.updateMany({ where: { id, milestoneVersion: data.version }, data: {
    milestones: data.milestones.map(m => ({ ...m, done: m.status === 'Complete' })),
    progressNote: data.progressNote || '', milestoneVersion: { increment: 1 },
  } });
  if (!changed.count) return error(res, 'Proyek berubah atau tidak ditemukan. Muat ulang sebelum menyimpan.', 409);
  return success(res, 'Milestone tersimpan', await prisma.project.findUnique({ where: { id } }));
});
const deleteProject = wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return error(res, 'Project not found.', 404);
  try {
    // Required foreign keys restrict deletion when donations or transactions exist,
    // including payments created concurrently with this request.
    await prisma.project.delete({ where: { id } });
    return success(res, 'Project deleted successfully.', { id });
  } catch (e) {
    if (e.code === 'P2025') return error(res, 'Project not found. Refresh the project list.', 404);
    if (e.code === 'P2003') return error(res, 'This project has donations or transactions and cannot be deleted. Payment history must be preserved.', 409);
    throw e;
  }
});
module.exports = { deleteProject, getAllProjects, getProject, createProject, updateMilestones };
