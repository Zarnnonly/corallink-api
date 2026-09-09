# 🪸 CoralLink API

Backend API untuk platform konservasi terumbu karang — SDG 14 (Life Below Water).

## Tech Stack
- **Runtime**: Node.js + Express.js
- **Database**: MySQL (via Laragon) + Prisma ORM
- **Auth**: JWT + bcrypt
- **Validasi**: Zod
- **Upload**: Multer
- **AI**: Integrasi ke model EfficientNetB0 (dummy mode tersedia kalau API ML belum siap)

## Setup di Laptop Kamu

### 1. Extract & install dependencies
```bash
cd corallink-api
npm install
```

### 2. Konfigurasi environment
```bash
copy .env.example .env
```
Edit `.env`, sesuaikan `DATABASE_URL` dengan Laragon kamu (biasanya user `root`, password kosong).

### 3. Buat database
Buka HeidiSQL/phpMyAdmin bawaan Laragon, buat database bernama `corallink_db`.
(Atau biarkan saja, `prisma migrate dev` di bawah otomatis bikin kalau belum ada — asal user MySQL punya izin CREATE DATABASE.)

### 4. Migrate & seed
```bash
npm run db:migrate
npm run db:seed
```
Ini akan membuat 3 tabel (`users`, `projects`, `donations`) dan 2 akun testing:
- Admin: `admin@corallink.com` / `admin123`
- Investor: `investor@corallink.com` / `investor123`

### 5. Jalankan server
```bash
npm run dev
```
Server jalan di `http://localhost:3000`

## Struktur Folder
```
corallink-api/
├── prisma/
│   ├── schema.prisma      # Definisi 3 tabel
│   └── seed.js            # Data awal (admin & investor testing)
├── src/
│   ├── config/prisma.js   # Instance PrismaClient
│   ├── controllers/       # Logic tiap fitur
│   ├── middleware/        # auth, role check, upload, error handler
│   ├── routes/            # Definisi endpoint
│   ├── utils/             # response formatter & integrasi AI
│   └── server.js          # Entry point
├── uploads/                # Tempat foto karang tersimpan
└── .env.example
```

## Daftar Endpoint

| Method | Endpoint                    | Role     | Keterangan                          |
|--------|------------------------------|----------|--------------------------------------|
| POST   | `/api/auth/register`        | Publik   | Registrasi (otomatis role investor) |
| POST   | `/api/auth/login`           | Publik   | Login                                |
| GET    | `/api/auth/profile`         | All      | Profil user yang login               |
| GET    | `/api/projects`             | Publik   | Daftar proyek (pagination + filter `?status=`) |
| GET    | `/api/projects/:id`         | Publik   | Detail proyek + daftar donasi        |
| POST   | `/api/projects`             | Admin    | Buat proyek baru (upload foto → AI klasifikasi) |
| PATCH  | `/api/projects/:id/status`  | Admin    | Update status verifikasi proyek      |
| POST   | `/api/donations`            | Investor | Donasi ke proyek                     |
| GET    | `/api/donations/saya`       | Investor | Riwayat donasi milik sendiri         |

## Format Response Standar
```json
{
  "success": true,
  "message": "Pesan status",
  "data": { }
}
```

## Cara Pakai JWT
Setelah login/register, simpan `token` dari response. Kirim di setiap request yang butuh login:
```
Authorization: Bearer <token>
```

## Integrasi AI (EfficientNetB0)
Diatur lewat `.env`:
- `USE_DUMMY_AI=true` → pakai hasil klasifikasi acak (dummy), berguna kalau API ML dari tim belum siap. Backend & frontend tetap bisa jalan normal.
- `USE_DUMMY_AI=false` + isi `AI_SERVICE_URL` → backend akan mengirim foto ke API ML asli (Flask/FastAPI) dan menyimpan hasilnya.

Format response yang diharapkan dari API ML:
```json
{ "status": "Bleached", "confidence_score": 0.87 }
```

## Contoh Testing dengan cURL

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"nama\":\"Budi\",\"email\":\"budi@email.com\",\"password\":\"rahasia123\"}"
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"admin@corallink.com\",\"password\":\"admin123\"}"
```

**Lihat daftar proyek:**
```bash
curl http://localhost:3000/api/projects
```
