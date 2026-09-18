# Panduan Agen untuk VMS

Dokumen ini berlaku untuk seluruh repository VMS (Vendor Management System). Baca instruksi yang lebih spesifik di subdirektori bila ada. Utamakan permintaan terbaru pengguna jika bertentangan dengan panduan ini.

## Konteks project

- Backend: PHP 8.2+, Laravel 12, Inertia.js 2. Frontend: React 19, Vite, Tailwind CSS 4.
- Route berada di `routes/web.php`; controller dan Form Request di `app/Http`; aturan bisnis di `app/Services`; policy dan middleware mengatur otorisasi.
- Halaman Inertia berada di `resources/js/Pages`, komponen bersama di `resources/js/Components`, dan utilitas frontend di `resources/js/utils`.
- Data master bawaan berada di `database/data/system_master_data.php`. Migration, factory, dan seeder ada di `database/`.
- Test PHP berada di `tests/Unit` dan `tests/Feature`; test frontend berbasis Node berada di `tests/Js`.

## Cara bekerja

- Sebelum mengubah kode, periksa `git status` dan alur yang benar-benar dipakai. Worktree dapat berisi perubahan pengguna; pertahankan semua perubahan yang tidak terkait.
- Batasi perubahan pada permintaan. Jangan melakukan refactor besar, mengganti business logic lain, atau mengubah data historis tanpa kebutuhan yang jelas.
- Jangan tambahkan komentar penanda perubahan secara default. Hanya jika pengguna memintanya secara eksplisit, gunakan `Start Update [tanggal], by @WNP: [penjelasan singkat]` tepat sebelum blok terkait, dengan sintaks komentar yang sah untuk bahasa file dan tanggal pengerjaan saat itu.
- Catat setiap fitur, perbaikan, perubahan konfigurasi, atau perubahan dokumentasi yang benar-benar dibuat ke `CHANGELOG.md` dalam task yang sama. Tambahkan entri singkat bertanggal `YYYY-MM-DD` pada bagian `[Unreleased]` dan kategori yang sesuai. Jangan mengarang riwayat lama, menulis perubahan yang baru direncanakan seolah sudah selesai, atau mencatat aktivitas pemeriksaan tanpa perubahan.
- Untuk nama produk dalam teks antarmuka, dokumentasi baru, dan komentar baru, gunakan `VMS` atau `Vendor Management System`. Jangan memperkenalkan kembali nama produk lama atau istilah negara yang tidak diperlukan. Jangan mengganti nama identifier teknis lama secara massal jika perubahan itu dapat merusak route, database, integrasi, atau histori.
- Gunakan format yang sudah ada: `.editorconfig`, `.prettierrc`, ESLint, dan Laravel Pint. Jangan mengedit file generated di `public/build` secara manual.

## Bahasa, data, dan tampilan

- Antarmuka mendukung Inggris (`en`) dan Indonesia (`id`). Teks sumber statis memakai bahasa Inggris; tambah padanan Indonesia di `resources/js/i18n/translations.js` atau `lang/id`, sesuai sisi yang menghasilkan teks.
- Pada React, gunakan `useLanguage()` dan `t(...)` untuk teks statis. Periksa juga teks pada alert, error, validasi, modal, tombol, placeholder, dan empty state. Komponen bersama tertentu sudah menerjemahkan `title` atau `children`; cek implementasinya sebelum menambah pemanggilan `t(...)`.
- Jangan menerjemahkan nama vendor, komentar, catatan, pesan, atau input manual dari database. Nilai enum/kode penyimpanan harus tetap stabil; terjemahkan hanya label tampilannya.
- Record `system_master_data` yang tetap boleh diterjemahkan berdasarkan kategori dan key yang dikenal melalui `resources/js/i18n/systemMasterData.js`. Record custom atau tidak dikenal harus ditampilkan apa adanya.
- Simpan pilihan bahasa dengan key VMS yang sudah ada (`vms_locale` dan `vms.preferences.v1`); jangan membuat key baru bernama produk lama.
- Mata uang default adalah IDR/Rp. Gunakan `config/currency.php`, `App\Support\Currency`, dan `resources/js/utils/currencyFormatters.js`; jangan hardcode format nominal di halaman.
- Untuk field usaha, pajak, bank, dan kontak, pertahankan istilah resmi/format validasi yang sudah dipakai. Jangan mengubah nilai tersimpan hanya demi menerjemahkan label.

## Alur bisnis dan keamanan

- Perubahan aksi vendor, kepatuhan, dokumen, kinerja, atau pembayaran harus diperiksa dari UI sampai route, validasi, policy, service, dan respons. Tampilkan hasil sukses maupun gagal kepada pengguna.
- Jangan hanya menyembunyikan opsi di UI: validasi dan otorisasi server harus tetap menolak input yang tidak sah.
- Bedakan status terkini dari riwayat. Aturan nonaktif tidak boleh dianggap sebagai kegagalan kepatuhan terkini; hasil evaluasi historis dan audit trail yang immutable tetap dipertahankan.
- Jaga data sensitif (identitas, rekening, kredensial) dari log, audit payload, dan output test yang tidak perlu. Jangan menampilkan isi `.env` atau secret.

## Database dan verifikasi

- Jangan menjalankan `php artisan migrate`, `migrate:fresh`, `migrate:refresh`, `db:wipe`, seeder, atau command lain yang mengubah data secara otomatis. Jika schema perlu diubah, buat migration yang aman, periksa sintaksnya, lalu ingatkan pengguna untuk menjalankannya sendiri.
- Jangan menjalankan `composer setup`: script tersebut menjalankan migration. Sebelum menjalankan feature test dengan `RefreshDatabase`, pastikan benar-benar memakai database test terisolasi; bila belum pasti, jangan jalankan dan laporkan alasannya.
- Verifikasi proporsional terhadap perubahan: `php -l` dan `vendor/bin/pint --test` untuk PHP; `npx prettier --check` dan ESLint untuk JS/JSX; `node --test tests/Js/*.test.js` untuk test frontend; `npm run build` bila UI berubah; `git diff --check` di akhir.
- Jika config cache mengarahkan test ke database lokal yang bukan database test, gunakan konfigurasi test yang tidak tercache dan periksa targetnya sebelum menjalankan test. Jangan menggunakan QA atau production DB untuk test yang menulis.
- Laporkan file yang diubah, perilaku yang diperbaiki, test yang benar-benar dijalankan, test yang belum dijalankan beserta alasannya, dan langkah manual pengguna jika diperlukan.
