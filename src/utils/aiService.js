// Integrasi ke API Model ML (EfficientNetB0) untuk klasifikasi kondisi karang.
// Saat AI_SERVICE_URL belum siap, set USE_DUMMY_AI=true di .env supaya alur
// upload -> simpan project tetap bisa jalan tanpa nunggu tim ML selesai.

const fs = require('fs');
const FormData = require('form-data');

async function classifyImage(imagePath) {
  const useDummy = process.env.USE_DUMMY_AI === 'true';

  if (useDummy) {
    // Dummy response, formatnya harus SAMA PERSIS dengan yang nanti dikembalikan
    // API ML asli, supaya tinggal tukar function ini tanpa ubah kode lain.
    const isHealthy = Math.random() > 0.5;
    return {
      status: isHealthy ? 'Healthy' : 'Bleached',
      confidence_score: Number((Math.random() * 0.3 + 0.7).toFixed(2)),
    };
  }

  try {
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));

    const response = await fetch(process.env.AI_SERVICE_URL, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      throw new Error(`AI service merespons dengan status ${response.status}`);
    }

    const result = await response.json();
    return {
      status: result.status,
      confidence_score: result.confidence_score,
    };
  } catch (err) {
    console.error('Gagal menghubungi AI service:', err.message);
    // Fallback: jangan sampai proses upload project gagal total hanya karena AI down
    return { status: 'Unknown', confidence_score: null };
  }
}

module.exports = { classifyImage };
