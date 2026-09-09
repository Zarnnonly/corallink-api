const prisma = require('../config/prisma');
const { success, error } = require('../utils/response');

async function getAllProjects(req, res) {
  try {
    const projects = await prisma.project.findMany();
    return success(res, 'Berhasil mengambil data proyek', projects, 200);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

async function createProject(req, res) {
  try {
    const { namaProyek, lokasi, tingkatKerusakan, targetRestorasi } = req.body;
    const newProject = await prisma.project.create({
      data: {
        adminId: req.user.id,
        namaProyek,
        lokasi,
        tingkatKerusakan,
        targetRestorasi
      }
    });
    return success(res, 'Proyek berhasil ditambahkan!', newProject, 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
}

module.exports = { getAllProjects, createProject };