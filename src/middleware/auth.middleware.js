const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  const unauthorized = () => res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa. Silakan login kembali.', data: null });
  if (!token) return unauthorized();
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); if (!Number.isSafeInteger(decoded.id)) return unauthorized(); }
  catch { return unauthorized(); }
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true } });
    if (!user) return unauthorized();
    req.user = user; return next();
  } catch (error) { return next(error); }
}
module.exports = { authenticate };
