# Deployment VPS CoralLink

Deployment 10 September 2026 dari commit 21842868a4d6008f81035894f1048c799fda70ae.
Checkout: /root/corallink-api. Aplikasi berjalan: /opt/corallink-api.
Perubahan lokal belum di-push ke GitHub.

## Infrastruktur

- Express via `npm start`, user/group `corallink`, bind 127.0.0.1:3000.
- MariaDB 11.8, database `corallink_db`, bind 127.0.0.1:3306.
- User database `corallink`@`127.0.0.1` hanya SELECT, INSERT, UPDATE, DELETE pada database aplikasi.
- Migrasi `20260909071554_init_tabel` diterapkan melalui `prisma migrate deploy`. Seed contoh tidak dijalankan.
- `/etc/systemd/system/corallink-api.service`: boot otomatis, Restart=on-failure, RestartSec=5, journald, ProtectSystem=strict, ProtectHome=true, NoNewPrivileges=true, direktori upload dapat ditulis.
- `/etc/mysql/mariadb.conf.d/99-corallink-local.cnf`: bind-address localhost.
- `/etc/nginx/sites-available/corallink-api`: HTTPS, client_max_body_size 20M, header Host/X-Real-IP/X-Forwarded-For/X-Forwarded-Proto.
- `/predict` dan `/health` tetap menuju Python 127.0.0.1:5000; route lainnya menuju Express.
- HTTP dialihkan ke HTTPS. Frontend harus memanggil POST /predict langsung melalui HTTPS.
- Sertifikat Let's Encrypt api.corallink.web.id berlaku hingga 9 Desember 2026; certbot.timer enabled.
- Backup sebelum perubahan: /root/corallink-deploy-backup/nginx-before dan mysql-before. Konfigurasi site lain dipertahankan.

## Environment produksi

File `/opt/corallink-api/.env`, permission 0640 root:corallink. Jangan commit atau menampilkan secret.

```
DATABASE_URL="mysql://corallink:<generated-secret>@127.0.0.1:3306/corallink_db"
JWT_SECRET="<generated-random-secret>"
JWT_EXPIRES_IN="1d"
NODE_ENV=production
PORT=3000
AI_SERVICE_URL="http://127.0.0.1:5000/predict"
USE_DUMMY_AI=false
```

DATABASE_URL dan JWT_SECRET wajib valid; nilai produksi sudah dibuat. AI_SERVICE_URL belum digunakan route existing. Frontend: VITE_API_URL=https://api.corallink.web.id. Auth memakai Bearer token; CORS mengizinkan https://corallink.web.id dan https://www.corallink.web.id.

## Endpoint existing

| Method | Path | Akses / kontrak |
|---|---|---|
| GET | / | Health Express |
| POST | /api/auth/register | Public; nama, email, password; role investor |
| POST | /api/auth/login | Public; email, password; user + token |
| GET | /api/auth/profile | Bearer JWT |
| GET | /api/projects | Public |
| POST | /api/projects | JWT; namaProyek, lokasi, tingkatKerusakan, targetRestorasi; belum ada pembatasan admin |
| POST | /api/donations | Investor JWT; projectId, jumlahDonasi, pesanDukungan opsional |
| GET | /api/donations/saya | Investor JWT |
| POST | /predict | Service ML existing; multipart field image |
| GET | /health | Health ML |

Respons Express menggunakan { success, message, data }. GET /api/auth dan GET /api/donations tidak tersedia; gunakan subroute di atas.

## Perubahan source dan dependency

src/server.js: CORS allowlist, trust proxy loopback, hilangkan X-Powered-By, bind localhost.
src/routes/auth.routes.js dan donation.routes.js: teruskan rejected promises ke error middleware Express 4.
package.json/package-lock.json: tambah cors 2.8.6; bcrypt 6.0.0, multer 2.3.0, override qs ^6.16.0 untuk perbaikan audit. `npm audit --omit=dev` melaporkan 0 vulnerability setelah perubahan.

## Verifikasi

GET localhost:3000, HTTPS / dan /api/projects: 200; projects data [].
CORS GET dan OPTIONS kedua origin: lulus, origin asing tidak memperoleh header allow-origin.
Registrasi/login/profile/history dan guard tanpa JWT: lulus. Akun tes sementara dihapus, seed tidak digunakan.
nginx -t lulus; tidak ada broken symlink sites-enabled; port 3000/3306 hanya localhost.

## Operasional

```
systemctl status corallink-api mariadb nginx
journalctl -u corallink-api -n 100 --no-pager
journalctl -u corallink-api -f
systemctl restart corallink-api
nginx -t && systemctl reload nginx
curl http://127.0.0.1:3000
curl https://api.corallink.web.id
curl https://api.corallink.web.id/api/projects
curl -i -X OPTIONS https://api.corallink.web.id/api/projects -H 'Origin: https://corallink.web.id' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: authorization,content-type'
```

Migrasi berikutnya harus menggunakan kredensial operator dengan izin DDL sementara, bukan memperluas izin permanen user runtime. Jangan menggunakan migrate dev/reset di production. Backup database sebelum migrasi berikutnya. Direktori deployment berisi dependency Prisma CLI untuk operasi migrasi; code dimiliki root. Salin deployment berikutnya dengan mempertahankan symlink.

## Pekerjaan aplikasi tersisa

Spesifikasi frontend backendnote.md belum diimplementasikan sebagai perluasan scope: name/user versus nama/investor, /auth/me, detail/slug proyek, milestones, transactions, phone, field proyek lengkap, cloud storage, bukti pembayaran dan status transaksi belum tersedia. Kontrak existing dipertahankan.
Route POST /api/projects saat ini mengizinkan semua user terautentikasi, bukan hanya admin. Pembatasan role dan validasi payload perlu dikerjakan sebelum alur admin/investasi dianggap siap produksi penuh. Donasi existing hanya pencatatan, bukan proses/verifikasi pembayaran.
Middleware upload tersedia (batas 5MB) tetapi tidak dipasang pada route proyek; Nginx 20M tidak otomatis menambah kemampuan upload backend. Helper AI tidak digunakan route; frontend dapat memanggil /predict HTTPS secara terpisah.
Service Python existing masih bind 0.0.0.0:5000 dan memakai Flask development server; konfigurasi tersebut tidak diubah dalam lingkup deployment Express. Backup data otomatis/offsite belum dikonfigurasi.

Verifikasi akhir: certbot renew --cert-name api.corallink.web.id --dry-run berhasil. Prediksi melalui HTTPS dengan TES1.jpg mengembalikan Bleached, confidence 99.58. Service Express active setelah restart. Hak DB CRUD terverifikasi dan tabel users kembali kosong sesudah tes. Health Express setelah restart: 200.

## Frontend integration follow-up — 10 September 2026

POST /api/projects now requires requireRole('admin') after authenticate. The controller validates names, locations and optional damage/restoration strings with Zod. No schema changes. The two source files were copied to /opt/corallink-api and Express restarted. Previous CORS, async error and security dependency changes remain intact. New regression test: node --test test/project-access.test.js. Backend GitHub push is unavailable to the connected frontend owner; a targeted patch is also in /root/corallink/backend-patches/admin-projects.patch.

The VPS restarted during browser testing. Express started automatically, but the existing ML process did not. Existing app.py was recovered unchanged under transient unit corallink-ml-recovery.service; permanent ML boot persistence is still pending. Nginx and the model were not modified.

## Complete project and payment integration — 10 September 2026

Backups before additive migrations: /root/corallink-deploy/publishing-backup (database.sql is private). New nullable project metadata and transaction/payment-settings tables were deployed using a temporary DDL operator which was removed afterward. Runtime corallink database permissions remain CRUD-only. Phone and contribution/contact fields were added in a second additive migration. Existing users/projects/donations are retained.

Project publishing uses POST /api/projects multipart image plus namaProyek/name, lokasi/location, description, species, fundingTarget, duration, fragments, area. JSON legacy fields are still accepted. Images are decoded/re-encoded with a 5MB upload and 25MP input limit. Public covers are served only under /uploads/covers; payment proofs are not exposed by static serving. ML analysis is independently repeated server-side and only the supported Bleached classification is accepted for new image-based restoration submissions; client AI fields never grant authorization.

GET /api/projects/:id and PUT /api/projects/:id/milestones support persisted detail/progress, with optimistic milestoneVersion conflict checks. GET /api/projects includes fundingRaised from Completed transactions only. Existing donation records do not contribute to verified funding.

Payment routes: GET/PUT /api/payments/settings (PUT admin); POST /api/transactions (investor, idempotencyKey UUID); GET /api/transactions/me (investor); GET /api/transactions (admin); GET /api/transactions/:id (owner/admin); POST /api/transactions/:id/proof (owner investor); GET /api/transactions/:id/proof (owner/admin); PUT /api/transactions/:id/status (admin). State flow: AwaitingProof -> Pending -> Completed or Failed. Rejected proof can be resubmitted; Completed cannot be overwritten. Monthly Contribution records represent manual monthly transfers, not automatic debits. No bank account is seeded into production; admin enters the official account in the frontend Payment Review page.

JWT middleware checks the current database role, so an old admin token cannot survive demotion. /api/auth/register supports name and nama plus optional phone; /api/auth/me aliases /profile.

Permanent ML service: /etc/systemd/system/corallink-ml.service, enabled at boot, runs as corallink from /opt/corallink-ml with loopback bind and automatic restart. Model and Flask application are copied unchanged from the existing source. The old transient recovery unit is stopped; Nginx remains unchanged. This retains the existing Flask server implementation.

Validation: isolated MariaDB migration plus test/publishing.test.js verifies publishing, image validation, detail, milestone conflict, role checks, private proof access, idempotency and verified-only funding. test/project-access.test.js covers baseline guard/validation. Browser harness and original-layout screenshots are in /root/corallink-browser-tools; test bank/account fixtures run only against isolated corallink_verify_ databases.


## QRIS and profile photo follow-up — 11 September 2026

The supplied static QRIS image is served at GET /api/payments/qris. Payment settings enable QRIS independently of an optional bank account; payment proof still requires manual administrator verification.

GET/POST /api/auth/profile/photo is authenticated and always resolves the user from the current session. Uploads reuse decoded-image validation, strip metadata, resize to at most 512px and atomically replace uploads/avatars/<user-id>.webp. Photos are private (no static route, private/no-store responses), and survive service restarts. Back up uploads/avatars together with covers and private proofs. No schema migration was required.

The complete frontend backend-patches/backend-sync.patch includes source, migrations, tests and deployment documentation relative to the original backend GitHub baseline; backend GitHub access remains read-only.
