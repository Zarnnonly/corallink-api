// Middleware: cek role user (dipakai setelah authenticate)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Role dibutuhkan: ${allowedRoles.join(' / ')}`,
        data: null,
      });
    }
    next();
  };
}

module.exports = { requireRole };
