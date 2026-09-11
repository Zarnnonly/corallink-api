// Middleware: tangkap semua error tak terduga biar response tetap rapi
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'MulterError' || err.message?.includes('Format file')) {
    return res.status(400).json({ success: false, message: err.message, data: null });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: (process.env.NODE_ENV !== 'production' || (err.statusCode >= 400 && err.statusCode < 500) ? err.message : null) || 'Terjadi kesalahan pada server',
    data: null,
  });
}

module.exports = { errorHandler };
