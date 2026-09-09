// Helper biar semua response API formatnya konsisten: { success, message, data }
function success(res, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function error(res, message, statusCode = 400, data = null) {
  return res.status(statusCode).json({ success: false, message, data });
}

module.exports = { success, error };
