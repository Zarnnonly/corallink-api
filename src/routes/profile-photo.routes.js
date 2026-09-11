const router = require('express').Router();
const fs = require('fs/promises');
const path = require('path');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { root, saveImage, removeImage } = require('../utils/files');
const { success } = require('../utils/response');

router.use(authenticate);
// The owner comes from the verified session; the client cannot choose a user ID.
const photoPath = req => path.join(root, 'avatars', `${req.user.id}.webp`);

router.get('/', async (req, res, next) => {
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  try {
    const image = await fs.readFile(photoPath(req));
    return res.type('webp').send(image);
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(204).end();
    next(err);
  }
});

router.post('/', upload.single('image'), async (req, res, next) => {
  let image;
  try {
    image = await saveImage(req.file, 'avatars', 512);
    // Atomic replacement preserves the previous photo if validation/write fails.
    await fs.rename(image.fullPath, photoPath(req));
    return success(res, 'Foto profil tersimpan', { uploaded: true });
  } catch (err) {
    await removeImage(image);
    next(err);
  }
});

module.exports = router;
