# Panduan Deployment ke Vercel (vercel.app)
### Aplikasi Digital RW 03 Kebon Kangkung

Aplikasi ini telah dikonfigurasi secara lengkap untuk siap di-deploy langsung ke **Vercel** (`*.vercel.app`) baik frontend SPA React (Vite) maupun backend Serverless API `/api/*`.

---

## 📁 File Konfigurasi yang Telah Disediakan

1. **`vercel.json`**
   - Mengatur framework preset `vite`.
   - Mengarahkan rute SPA ke `/index.html` agar tidak terjadi error 404 ketika pengguna me-refresh halaman di rute mana pun.
   - Mengarahkan permintaan backend `/api/(.*)` ke Vercel Serverless Function di `/api`.
   - Mengaktifkan caching otomatis untuk aset Vite (`/assets/*`).
   - Menambahkan header keamanan (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).

2. **`api/index.ts`**
   - Serverless Function Express untuk menangani API sinkronisasi data:
     - `GET /api/health`
     - `GET /api/data`
     - `GET /api/data/status`
     - `POST /api/data/sync`
     - `POST /api/data/publish`
   - Bekerja secara otomatis di lingkungan Serverless Vercel (dengan fallback ke memory & `/tmp`).

3. **`.vercelignore`**
   - Mencegah file lokal atau yang tidak perlu (seperti `node_modules`, log, `.git`) ikut terunggah, sehingga deployment menjadi cepat dan ringan.

4. **`package.json`**
   - Ditambahkan script `"vercel-build": "vite build"`.

---

## 🚀 Cara Deploy ke Vercel

Anda dapat memilih salah satu dari 2 metode di bawah ini:

### Cara 1: Menggunakan Vercel Dashboard & GitHub (Paling Direkomendasikan)

1. **Push repository ini ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Siap deploy ke Vercel"
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```

2. **Buka Vercel Dashboard**:
   - Masuk ke [vercel.com](https://vercel.com) menggunakan akun GitHub Anda.
   - Klik tombol **"Add New..."** lalu pilih **"Project"**.

3. **Import Repository**:
   - Pilih repository yang baru saja Anda push.

4. **Pengaturan Project (Build and Output Settings)**:
   - Vercel akan **otomatis mendeteksi**:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build` (atau `npm run vercel-build`)
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`
   - *Catatan: Anda tidak perlu mengubah apa pun karena sudah diatur di `vercel.json`.*

5. **Klik "Deploy"**:
   - Tunggu proses build selama 1 - 2 menit.
   - Setelah selesai, Anda akan langsung mendapatkan domain live gratis, misalnya:
     `https://digital-rw03-kebonkangkung.vercel.app`

---

### Cara 2: Menggunakan Vercel CLI (Langsung dari Terminal)

Jika Anda ingin langsung men-deploy dari komputer lokal tanpa melalui GitHub:

1. Jalankan perintah Vercel CLI:
   ```bash
   npx vercel
   ```

2. Ikuti instruksi di terminal:
   - `Set up and deploy?` Ketik **Y** lalu tekan Enter.
   - `Which scope do you want to deploy to?` Pilih akun Vercel Anda.
   - `Link to existing project?` Ketik **N**.
   - `What's your project's name?` Masukkan nama project (misal: `digitalrw03-kebonkangkung`).
   - `In which directory is your code located?` Tekan Enter (`./`).
   - `Want to modify settings?` Ketik **N** (pengaturan dari `vercel.json` akan dipakai otomatis).

3. Untuk deploy langsung ke production (domain utama):
   ```bash
   npx vercel --prod
   ```

---

## 🌐 Menghubungkan Custom Domain (Opsional)

Jika pengurus RW 03 memiliki domain sendiri (misalnya `rw03kebonkangkung.id`):
1. Buka dashboard project Anda di Vercel.
2. Masuk ke tab **Settings** > **Domains**.
3. Ketik nama domain Anda lalu klik **Add**.
4. Ikuti instruksi pengaturan DNS (tambahkan CNAME / A record yang diberikan Vercel ke panel domain Anda).
5. Vercel akan otomatis menerbitkan sertifikat SSL (HTTPS) gratis.
