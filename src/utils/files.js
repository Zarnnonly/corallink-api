const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const root = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
async function saveImage(file, folder, maxDimension = 2400) {
  if (!file) throw Object.assign(new Error('Pilih gambar JPG, PNG, atau WEBP.'), { statusCode: 400 });
  let buffer;
  try {
    const image = sharp(file.buffer, { limitInputPixels: 25000000 });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error();
    buffer = await image.rotate().resize({ width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  } catch { throw Object.assign(new Error('File gambar tidak valid atau terlalu besar.'), { statusCode: 400 }); }
  await fs.mkdir(path.join(root, folder), { recursive: true });
  const filename = `${randomUUID()}.webp`;
  const fullPath = path.join(root, folder, filename);
  await fs.writeFile(fullPath, buffer, { flag: 'wx', mode: 0o640 });
  return { filename, fullPath, url: `/uploads/${folder}/${filename}`, buffer };
}
const removeImage = (file) => file ? fs.unlink(file.fullPath).catch(() => {}) : Promise.resolve();
module.exports = { saveImage, removeImage, root };
