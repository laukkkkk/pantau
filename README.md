# Pantau - Monorepo

Pantau adalah platform monitoring terintegrasi yang terdiri dari tiga komponen utama: aplikasi mobile, backend service, dan AI service. Repositori ini dikonfigurasi sebagai monorepo untuk mempermudah koordinasi pengembangan lintas layanan.

## Struktur Repositori

```
pantau/
├── backend/       # Node.js backend API service
├── mobile/        # Aplikasi mobile (React Native / Flutter)
└── ai-service/    # AI / Machine Learning Python service
```

## Persyaratan Awal (Prerequisites)

Sebelum memulai development, pastikan Anda telah menginstal runtime berikut pada sistem Anda:
- **Node.js** (LTS v18 atau lebih baru) & npm/yarn/pnpm (untuk backend & mobile)
- **Python 3.9+** & pip (untuk AI service)
- **Git**

---

## Cara Menjalankan Layanan

Setiap service dijalankan secara mandiri dari dalam folder masing-masing.

### 1. Backend Service

Layanan backend menangani API utama, autentikasi, serta interaksi dengan database.

1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Salin berkas konfigurasi environment:
   ```bash
   cp .env.example .env
   ```
   *Sesuaikan nilai variabel lingkungan (seperti `DB_URL` dan `PORT`) di dalam file `.env`.*
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan server dalam mode development:
   ```bash
   npm run dev
   ```

### 2. Mobile Service

Aplikasi klien mobile yang digunakan oleh pengguna akhir.

1. Masuk ke direktori mobile:
   ```bash
   cd mobile
   ```
2. Install dependensi:
   - Jika menggunakan React Native (Expo):
     ```bash
     npm install
     ```
   - Jika menggunakan Flutter:
     ```bash
     flutter pub get
     ```
3. Jalankan aplikasi:
   - Untuk React Native (Expo):
     ```bash
     npm run start
     ```
   - Untuk Flutter:
     ```bash
     flutter run
     ```

### 3. AI Service

Layanan berbasis Python untuk pemrosesan model cerdas / data sains.

1. Masuk ke direktori AI service:
   ```bash
   cd ai-service
   ```
2. Buat dan aktifkan Virtual Environment Python:
   - **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Install dependensi yang dibutuhkan:
   ```bash
   pip install -r requirements.txt
   ```
4. Jalankan layanan:
   ```bash
   python main.py
   ```

---

## Strategi Branching (Branch Strategy)

Untuk menjaga stabilitas repositori utama, pengembangan harus mematuhi alur kerja berikut:

* **`main`**:
  - Menyimpan kode rilis stabil yang siap untuk tahap produksi (Production-ready).
  - Tidak ada commit langsung ke branch ini. Penggabungan kode hanya dilakukan melalui Pull Request (PR) dari branch `develop`.
* **`develop`**:
  - Branch utama untuk integrasi harian seluruh fitur baru.
  - Semua pengerjaan fitur/perbaikan digabungkan ke sini terlebih dahulu setelah melewati review.
* **`feature/<nama-fitur>`**:
  - Dibuat dari branch `develop` untuk fokus pada satu fitur spesifik.
  - Format penamaan branch: `feature/login-system`, `feature/dashboard-ui`, dll.
  - Setelah fitur selesai, buat Pull Request (PR) kembali ke branch `develop`.
* **`hotfix/<nama-perbaikan>`**:
  - Digunakan hanya untuk memperbaiki bug kritis di production (`main`) secara cepat.
  - Dibuat langsung dari `main`, dan setelah diperbaiki harus segera digabungkan (merge) ke `main` dan `develop`.
