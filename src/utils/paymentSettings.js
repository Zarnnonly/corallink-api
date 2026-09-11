const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const qrisPath = () => path.resolve(process.env.QRIS_IMAGE_PATH || path.join(__dirname, '../assets/qrkarim.png'));
async function paymentSettings() {
  const bank = await prisma.paymentSettings.findUnique({ where: { id: 1 } });
  const qrisAvailable = fs.existsSync(qrisPath());
  return { ...bank, enabled: Boolean(bank) || qrisAvailable, bankEnabled: Boolean(bank),
    qrisImageUrl: qrisAvailable ? '/api/payments/qris' : null,
    qrisMerchant: qrisAvailable ? 'Karimmm, Digital & Kreati' : null };
}
module.exports = { paymentSettings, qrisPath };
