# 🪸 CoralLink API

Backend API untuk **CoralLink**, platform konservasi dan pendanaan restorasi terumbu karang yang mendukung SDG 14 — *Life Below Water*.

## Fitur Utama

- Autentikasi JWT dengan role `admin` dan `investor`
- Manajemen profil dan foto profil privat
- Publikasi, detail, penghapusan, dan milestone proyek restorasi
- Validasi gambar serta analisis kondisi karang melalui layanan ML
- Pembayaran via QRIS atau rekening bank
- Upload bukti pembayaran dan verifikasi manual oleh admin
- Idempotency key untuk mencegah transaksi ganda
- Perhitungan dana proyek hanya dari transaksi berstatus `Completed`
- Dokumentasi interaktif Swagger/OpenAPI

## Tech Stack

- **Runtime:** Node.js + Express.js
- **Database:** MySQL/MariaDB + Prisma ORM
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **File upload:** Multer
- **Image processing:** Sharp
- **API documentation:** Swagger UI + OpenAPI 3.0
- **ML integration:** layanan Flask dengan model EfficientNetB0

## Arsitektur

```text
Frontend
   │
   ▼
Nginx / HTTPS
   ├── /api/*, /uploads/*, /api-docs/* ──► Express API :3000
   └── /predict, /health               ──► ML service :5000
                                                   │
Express API ──► MariaDB/MySQL                      │
     └────────► ML /predict ◄──────────────────────┘
```

Pada deployment VPS saat ini:

- API publik: `https://api.corallink.web.id`
- Swagger UI: `https://api.corallink.web.id/api-docs/`
- OpenAPI JSON: `https://api.corallink.web.id/api-docs.json`
- Source/working tree: `/root/corallink-api`
- Runtime production API: `/opt/corallink-api`
- Runtime production ML: `/opt/corallink-ml`
- Express bind ke `127.0.0.1:3000`
- ML bind ke `127.0.0.1:5000`

Detail deployment dan prosedur operasional tersedia di [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Prasyarat

- Node.js 20 atau lebih baru
- npm
- MySQL atau MariaDB
- Layanan ML untuk publikasi proyek yang menyertakan gambar

## Setup Lokal

### 1. Install dependency

```bash
cd corallink-api
npm install
```

### 2. Buat environment file

Linux/macOS:

```bash
cp .env.example .env
```

Windows:

```powershell
copy .env.example .env
```

Konfigurasi minimum:

```dotenv
DATABASE_URL="mysql://root:@localhost:3306/corallink_db"
JWT_SECRET="ganti_dengan_random_secret_yang_panjang"
JWT_EXPIRES_IN="1d"
PORT=3000
AI_SERVICE_URL="http://127.0.0.1:5000/predict"
USE_DUMMY_AI=false
```

Jangan commit `.env` atau credential production.

### 3. Siapkan database

Buat database `corallink_db`, lalu jalankan:

```bash
npm run db:generate
npm run db:migrate
```

Untuk data development opsional:

```bash
npm run db:seed
```

Seeder membuat akun testing lokal. Jangan menjalankan seed pada production.

### 4. Jalankan aplikasi

Development dengan auto-reload:

```bash
npm run dev
```

Mode biasa:

```bash
npm start
```

API tersedia di `http://127.0.0.1:3000` atau sesuai nilai `PORT`.

## Dokumentasi Swagger

Setelah server berjalan, buka:

- Swagger UI: `http://localhost:3000/api-docs/`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

Cara mencoba endpoint terproteksi:

1. Jalankan `POST /api/auth/login` atau `POST /api/auth/register`.
2. Salin `data.token` dari respons.
3. Klik **Authorize** dan masukkan token tanpa awalan `Bearer`.
4. Jalankan endpoint sesuai role akun.

Swagger **Try it out** menjalankan request sungguhan. Definisi OpenAPI berada di `src/config/swagger.js` dan harus diperbarui setiap kali kontrak API berubah.

`/predict` dan `/health` merupakan endpoint layanan ML terpisah. Endpoint tersebut tersedia melalui reverse proxy production, tetapi tidak didaftarkan pada aplikasi Express lokal.

## Endpoint API

### Health dan dokumentasi

- `GET /` — status Express API
- `GET /api-docs/` — Swagger UI
- `GET /api-docs.json` — spesifikasi OpenAPI
- `GET /health` — health check ML melalui reverse proxy production
- `POST /predict` — klasifikasi gambar melalui layanan ML production

### Authentication dan profil

- `POST /api/auth/register` — registrasi investor
- `POST /api/auth/login` — login dan mendapatkan JWT
- `GET /api/auth/me` — profil user aktif
- `GET /api/auth/profile` — alias untuk `/api/auth/me`
- `GET /api/auth/profile/photo` — mengambil foto profil milik sendiri
- `POST /api/auth/profile/photo` — mengganti foto profil milik sendiri

### Projects

- `GET /api/projects` — daftar proyek dan dana terverifikasi
- `GET /api/projects/:id` — detail proyek
- `POST /api/projects` — membuat proyek; khusus admin
- `PUT /api/projects/:id/milestones` — memperbarui milestone; khusus admin
- `DELETE /api/projects/:id` — menghapus proyek; khusus admin

Pembuatan proyek menerima JSON atau `multipart/form-data`. Field utama adalah `namaProyek`, `lokasi`, dan file opsional bernama `image`. Jika gambar dikirim, hasil analisis ML harus memenuhi klasifikasi restorasi yang didukung server.

Update milestone memakai optimistic concurrency. Kirim `version` sesuai `milestoneVersion` terbaru; konflik versi menghasilkan HTTP `409`.

### Transactions

- `POST /api/transactions` — membuat permintaan pembayaran; investor
- `GET /api/transactions/me` — riwayat transaksi sendiri; investor
- `GET /api/transactions` — daftar bukti pembayaran untuk review; admin
- `GET /api/transactions/:id` — detail transaksi; pemilik atau admin
- `POST /api/transactions/:id/proof` — upload bukti pembayaran; pemilik
- `GET /api/transactions/:id/proof` — mengambil bukti privat; pemilik atau admin
- `PUT /api/transactions/:id/status` — menerima/menolak pembayaran; admin

Alur status transaksi:

```text
AwaitingProof → Pending → Completed
                         └→ Failed → upload ulang → Pending
```

`idempotencyKey` wajib berupa UUID. Retry dengan key dan payload identik mengembalikan transaksi yang sama, bukan membuat transaksi baru.

`Monthly Contribution` saat ini berarti transfer manual bulanan, bukan debit otomatis.

### Payment settings

- `GET /api/payments/settings` — metode pembayaran aktif
- `PUT /api/payments/settings` — mengatur rekening bank; khusus admin
- `GET /api/payments/qris` — gambar QRIS

### Legacy donations

- `POST /api/donations` — dinonaktifkan dan mengembalikan HTTP `410`; gunakan transactions
- `GET /api/donations/saya` — riwayat donasi legacy milik investor

## Autentikasi

Kirim JWT pada endpoint terproteksi:

```http
Authorization: Bearer <token>
```

Role user diverifikasi kembali dari database pada setiap request terautentikasi. Perubahan role berlaku tanpa menunggu token lama kedaluwarsa.

## Upload Gambar

Upload menggunakan field `image` dengan ketentuan:

- Format: JPG, PNG, atau WEBP
- Ukuran file maksimal 5 MB
- Maksimal 25 megapiksel
- Satu file per request
- Metadata dibuang dan gambar disimpan ulang sebagai WEBP

Penyimpanan default berada di `uploads/` dan dapat diubah melalui `UPLOAD_DIR`.

- Cover proyek tersedia publik melalui `/uploads/covers/*`
- Foto profil bersifat privat dan maksimal 512 px
- Bukti pembayaran bersifat privat dan hanya dapat diakses lewat endpoint terautentikasi

## Integrasi ML

Saat admin membuat proyek dengan gambar, backend meneruskan gambar tersebut ke
`AI_SERVICE_URL`. Publikasi tanpa gambar tidak memanggil ML. Respons yang diterima
oleh alur publikasi adalah:

```json
{
  "predicted_class": "Bleached",
  "confidence": 99.58
}
```

`confidence` harus berupa angka `0`–`100`. Gambar proyek baru hanya diterima jika
`predicted_class` bernilai `Bleached`; service yang tidak tersedia menghasilkan
HTTP `503`, sedangkan klasifikasi yang tidak didukung menghasilkan HTTP `422`.

`USE_DUMMY_AI` masih tersedia untuk helper AI legacy, tetapi alur publikasi proyek
saat ini tidak mengandalkannya. Jalankan service ML atau kirim proyek tanpa gambar
ketika melakukan development lokal.

## Format Respons

Respons JSON Express menggunakan envelope yang konsisten:

```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": {}
}
```

Contoh error:

```json
{
  "success": false,
  "message": "Input tidak valid",
  "data": null
}
```

## Struktur Project

```text
corallink-api/
├── prisma/
│   ├── migrations/          # Migrasi database
│   ├── schema.prisma        # Schema Prisma
│   └── seed.js              # Data development opsional
├── src/
│   ├── config/              # Prisma dan Swagger
│   ├── controllers/         # Business logic
│   ├── middleware/          # Auth, role, upload, error handler
│   ├── routes/              # Route Express
│   ├── utils/               # AI, file, payment, response helpers
│   └── server.js            # Entry point
├── test/                    # Regression dan integration tests
├── uploads/
│   ├── covers/              # Cover proyek publik
│   ├── avatars/             # Foto profil privat
│   └── private/             # Bukti pembayaran privat
├── DEPLOYMENT.md
├── .env.example
└── package.json
```

## Testing

Test guard dan validasi yang tidak membutuhkan database integration khusus:

```bash
node --test test/project-access.test.js test/project-delete.test.js
```

Full publishing/payment test sengaja menolak database biasa. Gunakan database disposable dengan nama yang mengandung `corallink_verify_`, terapkan migrasi, lalu jalankan:

```bash
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/corallink_verify_test" \
  npx prisma migrate deploy

DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/corallink_verify_test" \
  node --test test/publishing.test.js
```

Jangan menjalankan integration test terhadap database production.

## Operasional Production

```bash
systemctl status corallink-api corallink-ml mariadb nginx
journalctl -u corallink-api -n 100 --no-pager
systemctl restart corallink-api
nginx -t && systemctl reload nginx
curl https://api.corallink.web.id
curl https://api.corallink.web.id/api-docs.json
```

Untuk migrasi production gunakan `prisma migrate deploy`, backup database terlebih dahulu, dan pakai credential operator dengan izin DDL sementara. Jangan gunakan `prisma migrate dev` atau `prisma migrate reset` pada production.
