# 🎨 DrawCanvas — Website Menggambar Online

Website menggambar online dengan panel admin. User bisa menggambar di canvas dan mengirim karya ke admin. Admin bisa review, setujui, atau tolak karya masuk.

---

## 📁 Struktur Project

```
drawapp/
├── server.js              # Entry point - Express server
├── package.json
├── .env.example           # Template environment variables
├── models/
│   └── Drawing.js         # MongoDB schema
├── routes/
│   ├── drawing.js         # Route: submit & gallery publik
│   └── admin.js           # Route: admin CRUD + auth
└── public/
    ├── index.html         # Halaman menggambar (user)
    ├── admin.html         # Panel admin
    ├── css/
    │   ├── style.css      # Styling halaman utama
    │   └── admin.css      # Styling admin panel
    └── js/
        ├── canvas.js      # Engine menggambar (canvas API)
        ├── app.js         # Logic halaman utama
        └── admin.js       # Logic admin panel
```

---

## 🚀 Cara Deploy ke Render + MongoDB Atlas

### STEP 1 — Setup MongoDB Atlas

1. Buka [mongodb.com/atlas](https://www.mongodb.com/atlas) → buat akun gratis
2. Buat **cluster baru** (pilih Free tier M0)
3. Buat **database user**: Security → Database Access → Add New User
   - Username: `drawapp_user`
   - Password: buat password kuat, simpan!
4. Whitelist IP: Security → Network Access → **Allow Access from Anywhere** (0.0.0.0/0)
5. Dapatkan **connection string**: Connect → Drivers → copy string seperti:
   ```
   mongodb+srv://drawapp_user:<password>@cluster0.xxxxx.mongodb.net/drawapp?retryWrites=true&w=majority
   ```
6. Ganti `<password>` dengan password yang dibuat tadi

---

### STEP 2 — Upload ke GitHub

```bash
# Di folder drawapp/
git init
git add .
git commit -m "Initial commit - DrawCanvas App"
git branch -M main
git remote add origin https://github.com/USERNAME/drawapp.git
git push -u origin main
```

---

### STEP 3 — Deploy ke Render

1. Buka [render.com](https://render.com) → Sign up / Login
2. Dashboard → **New** → **Web Service**
3. Pilih repo GitHub `drawapp`
4. Konfigurasi:
   | Setting | Value |
   |---------|-------|
   | Name | `drawapp` (atau nama lain) |
   | Runtime | **Node** |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | Free |

5. Tambah **Environment Variables** (klik "Advanced" atau tab "Environment"):

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | connection string MongoDB Atlas |
   | `SESSION_SECRET` | string random panjang, contoh: `x9k2m8p4r7n1q5j3v6w0` |
   | `ADMIN_USERNAME` | username admin (contoh: `admin`) |
   | `ADMIN_PASSWORD` | password admin yang kuat |
   | `NODE_ENV` | `production` |

6. Klik **Deploy Web Service**
7. Tunggu build selesai (2-5 menit)
8. Akses app di URL yang diberikan Render, contoh: `https://drawapp.onrender.com`

---

## 🔑 Login Admin

- URL Admin Panel: `https://your-app.onrender.com/admin`
- Username & password sesuai env variable `ADMIN_USERNAME` / `ADMIN_PASSWORD`

---

## ✏️ Fitur Menggambar

| Alat | Fungsi |
|------|--------|
| Pena | Garis tipis presisi |
| Kuas | Garis tebal lembut |
| Spidol | Semi-transparan |
| Garis | Garis lurus |
| Kotak | Persegi panjang |
| Lingkaran | Ellipse/lingkaran |
| Isi warna | Flood fill area |
| Penghapus | Hapus bagian gambar |

- **12 warna preset** + color picker custom
- **Ukuran kuas** 1–60px
- **Opasitas** 5–100%
- **Undo** (Ctrl+Z / tombol)
- **Clear canvas**

---

## 👤 Fitur Admin

- Login dengan username/password (sesi tersimpan 24 jam)
- Lihat semua gambar masuk dengan filter: Semua / Pending / Disetujui / Ditolak
- Buka gambar → lihat detail lengkap + gambar
- Ubah status: **Setujui** / **Tolak** + tambah catatan
- **Hapus** gambar
- Statistik ringkas (total, pending, approved, rejected)
- Pagination (20 karya per halaman)

---

## 🔧 Jalankan Lokal (Development)

```bash
# 1. Masuk ke folder
cd drawapp

# 2. Install dependencies
npm install

# 3. Buat file .env dari template
cp .env.example .env
# Edit .env dengan editor, isi MONGODB_URI dll

# 4. Jalankan
npm run dev   # dengan nodemon (auto-restart)
# atau
npm start     # tanpa auto-restart

# 5. Buka browser
# http://localhost:3000        → halaman menggambar
# http://localhost:3000/admin  → panel admin
```

---

## 📝 Environment Variables

| Variable | Keterangan | Wajib |
|----------|-----------|-------|
| `MONGODB_URI` | Connection string MongoDB Atlas | ✅ |
| `SESSION_SECRET` | Secret key untuk session | ✅ |
| `ADMIN_USERNAME` | Username login admin | ✅ |
| `ADMIN_PASSWORD` | Password login admin | ✅ |
| `PORT` | Port server (default: 3000) | ❌ |
| `NODE_ENV` | `production` atau `development` | ❌ |

---

## ⚠️ Catatan Penting

- **Gambar disimpan sebagai base64** di MongoDB. Untuk skala besar, pertimbangkan Cloudinary/S3.
- **Session disimpan di MongoDB** via connect-mongo
- Free tier Render akan **sleep setelah 15 menit idle** — akses pertama agak lambat
- Free tier MongoDB Atlas memiliki limit **512MB storage**

---

## 📞 API Endpoints

```
POST /api/drawing/submit         Kirim gambar baru
GET  /api/drawing/gallery        Galeri publik (approved)

POST /api/admin/login            Login admin
POST /api/admin/logout           Logout admin
GET  /api/admin/check            Cek status login

GET  /api/admin/drawings         List gambar (+ filter, pagination)
GET  /api/admin/drawings/:id     Detail + gambar
PUT  /api/admin/drawings/:id/status  Ubah status
DELETE /api/admin/drawings/:id   Hapus gambar
GET  /api/admin/stats            Statistik
```
