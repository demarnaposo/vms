# Changelog VMS

Catatan perubahan VMS (Vendor Management System) dimulai pada 2026-09-18. Perubahan sebelum tanggal ini tidak direkonstruksi tanpa verifikasi. Entri baru ditambahkan ke `[Unreleased]` pada kategori `Added`, `Changed`, `Fixed`, `Removed`, atau `Security`; pindahkan ke versi rilis hanya saat rilis tersebut benar-benar dibuat.

## [Unreleased]

### Fixed

- 2026-09-18 — Menonaktifkan spinner progress di pojok kanan atas yang bertabrakan dengan pengalih bahasa; bar progress tetap tampil.
- 2026-09-18 — Vendor lama yang belum memverifikasi email otomatis mendapat tautan saat login, dengan jeda pengiriman agar login berulang tidak mengirim email bertubi-tubi.
- 2026-09-18 — Tautan verifikasi email yang dibuka di browser lain dilanjutkan otomatis setelah vendor login, tanpa melewati pemeriksaan akun dan tanda tangan tautan.

### Added

- 2026-09-18 — Verifikasi email vendor saat registrasi, halaman konfirmasi bilingual, tautan bertanda tangan, dan opsi kirim ulang dengan pembatasan permintaan.
- 2026-09-18 — Menambahkan panduan agen dan changelog project untuk mencatat perubahan berikutnya.

### Changed

- 2026-09-18 — Pengiriman email verifikasi otomatis tidak lagi menampilkan alert; alert sukses hanya muncul setelah vendor meminta kirim ulang.
- 2026-09-18 — Akun vendor lama dengan email belum terverifikasi langsung diarahkan ke halaman verifikasi saat login; route bersama juga menunggu verifikasi tanpa mengubah akses staff.
- 2026-09-18 — Akses area vendor menunggu verifikasi email; perubahan alamat email profil vendor memerlukan verifikasi ulang tanpa mengunci akun staff.
- 2026-09-18 — Komentar penanda `@WNP` hanya ditambahkan jika diminta secara eksplisit.
